//! 酒馆商店系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 商店规则
//! - 5 个商店槽位，展示可购买的怪兽
//! - 刷新商店消耗 2 金币
//! - 购买价格: 1★=1金, 2★=2金, 3★+=3金
//! - 可冻结槽位，保留到下回合
//! - 每回合开始自动刷新（未冻结的槽位）
//!
//! ## 抽卡接口
//! 实现 `GcCardAcquisition` trait，支持运行时动态切换抽卡方式

use serde::{Deserialize, Serialize};
use crate::{
    GcMonster, GcMonsterAttribute, GcEconomy, 
    gc_get_tier_weights, GcMonsterTier, GC_REFRESH_COST,
    gc_card_acquisition::{
        GcCardAcquisition, GcAcquisitionContext, GcAcquisitionSlot, GcAcquisitionResult
    },
};

// =============================================================================
// 常量
// =============================================================================

/// 商店槽位数量
pub const GC_SHOP_SLOTS: usize = 5;

// =============================================================================
// 商店结构
// =============================================================================

/// 酒馆商店
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTavernShop {
    /// 商店槽位 (5个)
    pub slots: [Option<GcMonster>; GC_SHOP_SLOTS],
    /// 冻结状态
    pub frozen: [bool; GC_SHOP_SLOTS],
    /// 商店等级 (影响怪兽稀有度)
    pub shop_level: u8,
}

impl Default for GcTavernShop {
    fn default() -> Self {
        Self {
            slots: [None, None, None, None, None],
            frozen: [false; GC_SHOP_SLOTS],
            shop_level: 1,
        }
    }
}

impl GcTavernShop {
    /// 创建新商店
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 创建指定等级的商店
    pub fn with_level(level: u8) -> Self {
        Self {
            shop_level: level,
            ..Default::default()
        }
    }
    
    // =========================================================================
    // 商店操作
    // =========================================================================
    
    /// 刷新商店 (需要外部提供随机数)
    /// 
    /// # 参数
    /// - `economy`: 玩家经济状态 (用于扣费)
    /// - `pool`: 怪兽池 (用于抽取怪兽)
    /// - `random_rolls`: 随机数数组 (0-99, 用于决定稀有度)
    /// 
    /// # 返回
    /// 是否成功刷新
    pub fn refresh(
        &mut self,
        economy: &mut GcEconomy,
        pool: &GcMonsterPool,
        random_rolls: &[u8],
    ) -> bool {
        // 检查金币
        if !economy.can_afford(GC_REFRESH_COST) {
            return false;
        }
        
        // 扣费
        economy.spend(GC_REFRESH_COST);
        
        // 刷新未冻结的槽位
        self.refresh_unfrozen(pool, random_rolls);
        
        true
    }
    
    /// 免费刷新 (回合开始时)
    pub fn free_refresh(&mut self, pool: &GcMonsterPool, random_rolls: &[u8]) {
        self.refresh_unfrozen(pool, random_rolls);
    }
    
    /// 刷新未冻结的槽位
    fn refresh_unfrozen(&mut self, pool: &GcMonsterPool, random_rolls: &[u8]) {
        let weights = gc_get_tier_weights(self.shop_level);
        
        for (i, slot) in self.slots.iter_mut().enumerate() {
            if self.frozen[i] {
                continue; // 跳过冻结的槽位
            }
            
            // 决定稀有度
            let roll = random_rolls.get(i).copied().unwrap_or(0);
            let tier = weights.select_tier(roll);
            
            // 从池中抽取怪兽
            *slot = pool.get_random_monster(tier, random_rolls.get(i + GC_SHOP_SLOTS).copied().unwrap_or(0));
        }
        
        // 刷新后解除冻结
        self.frozen = [false; GC_SHOP_SLOTS];
    }
    
    /// 购买怪兽
    /// 
    /// # 返回
    /// 购买的怪兽 (如果成功)
    pub fn buy(&mut self, slot_index: usize, economy: &mut GcEconomy) -> Option<GcMonster> {
        if slot_index >= GC_SHOP_SLOTS {
            return None;
        }
        
        let monster = self.slots[slot_index].as_ref()?;
        let price = monster.buy_price();
        
        if !economy.can_afford(price) {
            return None;
        }
        
        economy.spend(price);
        let purchased = self.slots[slot_index].take();
        self.frozen[slot_index] = false; // 购买后解除冻结
        
        purchased
    }
    
    /// 冻结/解冻槽位
    pub fn toggle_freeze(&mut self, slot_index: usize) -> bool {
        if slot_index >= GC_SHOP_SLOTS {
            return false;
        }
        
        // 只有有怪兽的槽位才能冻结
        if self.slots[slot_index].is_some() {
            self.frozen[slot_index] = !self.frozen[slot_index];
            true
        } else {
            false
        }
    }
    
    /// 设置冻结状态
    pub fn set_freeze(&mut self, slot_index: usize, frozen: bool) {
        if slot_index < GC_SHOP_SLOTS && self.slots[slot_index].is_some() {
            self.frozen[slot_index] = frozen;
        }
    }
    
    /// 获取槽位状态
    pub fn get_slot(&self, index: usize) -> Option<&GcMonster> {
        self.slots.get(index).and_then(|s| s.as_ref())
    }
    
    /// 槽位是否被冻结
    pub fn is_frozen(&self, index: usize) -> bool {
        self.frozen.get(index).copied().unwrap_or(false)
    }
    
    /// 更新商店等级 (玩家升级时调用)
    pub fn update_level(&mut self, player_level: u8) {
        self.shop_level = player_level;
    }
    
    // =========================================================================
    // 状态查询
    // =========================================================================
    
    /// 获取可购买的怪兽列表
    pub fn available_monsters(&self) -> Vec<(usize, &GcMonster)> {
        self.slots.iter()
            .enumerate()
            .filter_map(|(i, opt)| opt.as_ref().map(|m| (i, m)))
            .collect()
    }
    
    /// 是否有可购买的怪兽
    pub fn has_available(&self) -> bool {
        self.slots.iter().any(|s| s.is_some())
    }
    
    /// 获取商店状态摘要
    pub fn summary(&self) -> String {
        let available = self.slots.iter().filter(|s| s.is_some()).count();
        let frozen = self.frozen.iter().filter(|&&f| f).count();
        format!("商店 Lv.{} | 可购:{} | 冻结:{}", self.shop_level, available, frozen)
    }
}

// =============================================================================
// 实现 GcCardAcquisition trait
// =============================================================================

/// 酒馆商店适配器 (持有怪兽池引用用于刷新)
/// 
/// 由于 trait 需要独立工作，这个结构体包装了 GcTavernShop 并持有 GcMonsterPool
#[derive(Clone, Debug)]
pub struct GcTavernShopAdapter {
    /// 酒馆商店
    pub shop: GcTavernShop,
    /// 怪兽池
    pub pool: GcMonsterPool,
}

impl GcTavernShopAdapter {
    /// 创建新的适配器
    pub fn new(shop_level: u8) -> Self {
        Self {
            shop: GcTavernShop::with_level(shop_level),
            pool: GcMonsterPool::with_defaults(),
        }
    }
    
    /// 从现有商店和池创建
    pub fn from_parts(shop: GcTavernShop, pool: GcMonsterPool) -> Self {
        Self { shop, pool }
    }
    
    /// 生成随机数 (实际使用时应从上下文获取)
    fn generate_rolls(&self, ctx: &GcAcquisitionContext) -> Vec<u8> {
        if !ctx.random_rolls.is_empty() {
            ctx.random_rolls.clone()
        } else {
            // 默认随机数 (生产环境应使用真随机)
            (0..10).map(|i| ((i * 37 + 13) % 256) as u8).collect()
        }
    }
}

impl GcCardAcquisition for GcTavernShopAdapter {
    type Item = GcMonster;
    
    fn acquire(&mut self, slot_index: usize, ctx: &mut GcAcquisitionContext) -> GcAcquisitionResult<Self::Item> {
        // 检查槽位有效性
        if slot_index >= GC_SHOP_SLOTS {
            return GcAcquisitionResult::failure("无效槽位");
        }
        
        // 检查槽位是否有怪兽
        let monster = match self.shop.slots[slot_index].as_ref() {
            Some(m) => m,
            None => return GcAcquisitionResult::failure("该槽位没有怪兽"),
        };
        
        // 获取价格
        let price = monster.buy_price();
        
        // 检查金币
        if !ctx.can_afford(price) {
            return GcAcquisitionResult::failure("金币不足");
        }
        
        // 扣除金币
        ctx.spend(price);
        
        // 获取怪兽
        let purchased = self.shop.slots[slot_index].take();
        self.shop.frozen[slot_index] = false;
        
        match purchased {
            Some(m) => GcAcquisitionResult::success(m, price),
            None => GcAcquisitionResult::failure("购买失败"),
        }
    }
    
    fn can_acquire(&self, slot_index: usize, ctx: &GcAcquisitionContext) -> bool {
        if slot_index >= GC_SHOP_SLOTS {
            return false;
        }
        
        match self.shop.slots[slot_index].as_ref() {
            Some(monster) => ctx.can_afford(monster.buy_price()),
            None => false,
        }
    }
    
    fn get_available_slots(&self) -> Vec<GcAcquisitionSlot> {
        self.shop.slots.iter()
            .enumerate()
            .map(|(i, opt)| {
                match opt {
                    Some(monster) => {
                        let star_str = if monster.golden_level > 0 {
                            format!("{}★金Lv{}", monster.star, monster.golden_level)
                        } else {
                            format!("{}★", monster.star)
                        };
                        
                        GcAcquisitionSlot::new(
                            i,
                            &monster.id,
                            &monster.name,
                            monster.buy_price(),
                            monster.star,
                        )
                        .with_frozen(self.shop.frozen[i])
                        .with_description(&star_str)
                    },
                    None => GcAcquisitionSlot::new(i, "", "空", 0, 0),
                }
            })
            .collect()
    }
    
    fn refresh(&mut self, ctx: &mut GcAcquisitionContext, free: bool) -> bool {
        let cost = if free { 0 } else { GC_REFRESH_COST };
        
        if !free && !ctx.can_afford(cost) {
            return false;
        }
        
        if !free {
            ctx.spend(cost);
        }
        
        // 刷新商店
        let rolls = self.generate_rolls(ctx);
        self.shop.free_refresh(&self.pool, &rolls);
        
        // 更新商店等级
        if ctx.player_level > 0 {
            self.shop.update_level(ctx.player_level);
        }
        
        true
    }
    
    fn refresh_cost(&self) -> u32 {
        GC_REFRESH_COST
    }
    
    fn slot_count(&self) -> usize {
        GC_SHOP_SLOTS
    }
    
    fn toggle_freeze(&mut self, slot_index: usize) -> bool {
        self.shop.toggle_freeze(slot_index)
    }
    
    fn is_frozen(&self, slot_index: usize) -> bool {
        self.shop.is_frozen(slot_index)
    }
    
    fn mode_name(&self) -> &'static str {
        "酒馆战棋模式"
    }
}

// =============================================================================
// 怪兽池 (用于生成商店怪兽)
// =============================================================================

/// 怪兽模板
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMonsterTemplate {
    pub template_id: String,
    pub name: String,
    pub tier: GcMonsterTier,
    pub level: u8,
    pub attribute: GcMonsterAttribute,
    pub base_atk: u32,
    pub base_def: u32,
    pub base_hp: u32,
}

/// 怪兽池 (所有可抽取的怪兽模板)
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GcMonsterPool {
    /// 按稀有度分类的怪兽模板
    templates: Vec<GcMonsterTemplate>,
}

impl GcMonsterPool {
    /// 创建空池
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 创建带默认怪兽的池
    pub fn with_defaults() -> Self {
        let mut pool = Self::new();
        pool.add_default_monsters();
        pool
    }
    
    /// 添加怪兽模板
    pub fn add_template(&mut self, template: GcMonsterTemplate) {
        self.templates.push(template);
    }
    
    /// 添加默认怪兽
    pub fn add_default_monsters(&mut self) {
        // Tier 1 (1费)
        self.add_template(GcMonsterTemplate {
            template_id: "slime".to_string(),
            name: "史莱姆".to_string(),
            tier: GcMonsterTier::Tier1,
            level: 1,
            attribute: GcMonsterAttribute::Water,
            base_atk: 50,
            base_def: 30,
            base_hp: 60,
        });
        
        self.add_template(GcMonsterTemplate {
            template_id: "goblin".to_string(),
            name: "哥布林".to_string(),
            tier: GcMonsterTier::Tier1,
            level: 1,
            attribute: GcMonsterAttribute::Earth,
            base_atk: 60,
            base_def: 20,
            base_hp: 50,
        });
        
        self.add_template(GcMonsterTemplate {
            template_id: "fire_sprite".to_string(),
            name: "火精灵".to_string(),
            tier: GcMonsterTier::Tier1,
            level: 2,
            attribute: GcMonsterAttribute::Fire,
            base_atk: 70,
            base_def: 10,
            base_hp: 40,
        });
        
        // Tier 2 (2费)
        self.add_template(GcMonsterTemplate {
            template_id: "wolf".to_string(),
            name: "灰狼".to_string(),
            tier: GcMonsterTier::Tier2,
            level: 3,
            attribute: GcMonsterAttribute::Earth,
            base_atk: 90,
            base_def: 40,
            base_hp: 80,
        });
        
        self.add_template(GcMonsterTemplate {
            template_id: "harpy".to_string(),
            name: "鹰身女妖".to_string(),
            tier: GcMonsterTier::Tier2,
            level: 3,
            attribute: GcMonsterAttribute::Wind,
            base_atk: 100,
            base_def: 30,
            base_hp: 70,
        });
        
        // Tier 3 (3费)
        self.add_template(GcMonsterTemplate {
            template_id: "golem".to_string(),
            name: "石魔像".to_string(),
            tier: GcMonsterTier::Tier3,
            level: 5,
            attribute: GcMonsterAttribute::Earth,
            base_atk: 80,
            base_def: 120,
            base_hp: 150,
        });
        
        self.add_template(GcMonsterTemplate {
            template_id: "phoenix".to_string(),
            name: "火凤凰".to_string(),
            tier: GcMonsterTier::Tier3,
            level: 5,
            attribute: GcMonsterAttribute::Fire,
            base_atk: 140,
            base_def: 60,
            base_hp: 100,
        });
        
        // Tier 4 (4费 -> 3金购买)
        self.add_template(GcMonsterTemplate {
            template_id: "dragon".to_string(),
            name: "幼龙".to_string(),
            tier: GcMonsterTier::Tier4,
            level: 6,
            attribute: GcMonsterAttribute::Fire,
            base_atk: 180,
            base_def: 100,
            base_hp: 200,
        });
        
        // Tier 5 (5费 -> 3金购买)
        self.add_template(GcMonsterTemplate {
            template_id: "ancient_dragon".to_string(),
            name: "远古巨龙".to_string(),
            tier: GcMonsterTier::Tier5,
            level: 8,
            attribute: GcMonsterAttribute::Fire,
            base_atk: 250,
            base_def: 150,
            base_hp: 300,
        });
        
        self.add_template(GcMonsterTemplate {
            template_id: "archangel".to_string(),
            name: "大天使".to_string(),
            tier: GcMonsterTier::Tier5,
            level: 8,
            attribute: GcMonsterAttribute::Light,
            base_atk: 200,
            base_def: 200,
            base_hp: 280,
        });
    }
    
    /// 获取指定稀有度的怪兽模板列表
    pub fn templates_by_tier(&self, tier: GcMonsterTier) -> Vec<&GcMonsterTemplate> {
        self.templates.iter()
            .filter(|t| t.tier == tier)
            .collect()
    }
    
    /// 随机获取一个怪兽
    /// 
    /// # 参数
    /// - `tier`: 稀有度
    /// - `roll`: 随机数 (0-255)
    pub fn get_random_monster(&self, tier: GcMonsterTier, roll: u8) -> Option<GcMonster> {
        let candidates = self.templates_by_tier(tier);
        
        if candidates.is_empty() {
            return None;
        }
        
        let idx = roll as usize % candidates.len();
        let template = &candidates[idx];
        
        Some(self.create_monster_from_template(template))
    }
    
    /// 从模板创建怪兽实例
    fn create_monster_from_template(&self, template: &GcMonsterTemplate) -> GcMonster {
        let id = format!("{}_{}", template.template_id, uuid_simple());
        
        GcMonster::new_with_template(
            &id,
            &template.template_id,
            &template.name,
            template.level,
            template.attribute.clone(),
            template.base_atk,
            template.base_def,
            template.base_hp,
        )
    }
}

/// 简单的UUID生成
fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:x}{:x}", duration.as_secs(), duration.subsec_nanos())
}

// =============================================================================
// 卖出操作
// =============================================================================

/// 卖出怪兽
/// 
/// # 返回
/// 获得的金币数
pub fn gc_sell_monster(monster: &GcMonster, economy: &mut GcEconomy) -> u32 {
    let price = monster.sell_price();
    economy.earn(price);
    price
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_shop_basics() {
        let shop = GcTavernShop::new();
        assert_eq!(shop.shop_level, 1);
        assert!(!shop.has_available());
    }
    
    #[test]
    fn test_refresh_and_buy() {
        let mut shop = GcTavernShop::with_level(3);
        let mut economy = GcEconomy::with_gold(10);
        let pool = GcMonsterPool::with_defaults();
        let rolls: Vec<u8> = (0..10).collect();
        
        // 刷新
        assert!(shop.refresh(&mut economy, &pool, &rolls));
        assert_eq!(economy.gold, 8); // 扣了2金
        assert!(shop.has_available());
        
        // 购买
        let monster = shop.buy(0, &mut economy);
        assert!(monster.is_some());
    }
    
    #[test]
    fn test_freeze() {
        let mut shop = GcTavernShop::new();
        let pool = GcMonsterPool::with_defaults();
        let rolls: Vec<u8> = (0..10).collect();
        
        shop.free_refresh(&pool, &rolls);
        
        // 冻结第一个槽位
        shop.toggle_freeze(0);
        assert!(shop.is_frozen(0));
        
        // 再次刷新
        shop.free_refresh(&pool, &[50, 50, 50, 50, 50, 50, 50, 50, 50, 50]);
        
        // 冻结的槽位应该保持不变
        assert!(!shop.is_frozen(0)); // 刷新后解除冻结
    }
    
    #[test]
    fn test_sell_monster() {
        let mut economy = GcEconomy::new();
        let monster = GcMonster::new_with_star(
            "test", "test", "Test", 4, 
            GcMonsterAttribute::Fire, 100, 100, 100,
            2, 0 // 2星
        );
        
        let earned = gc_sell_monster(&monster, &mut economy);
        assert_eq!(earned, 2); // 2星卖2金
    }
}
