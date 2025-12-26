//! 公共卡池系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现类似"杀戮尖塔"的抽卡机制：
//! - 公共卡池展示 5 张卡
//! - 玩家消耗行动力获取卡牌
//! - 卡池自动补充
//!
//! ## 抽卡接口
//! 实现 `GcCardAcquisition` trait，支持运行时动态切换抽卡方式

use serde::{Deserialize, Serialize};
use crate::GcCard;
use crate::gc_card_acquisition::{
    GcCardAcquisition, GcAcquisitionContext, GcAcquisitionSlot, GcAcquisitionResult
};
use rand::seq::SliceRandom;
use rand::thread_rng;

// =============================================================================
// 卡池配置
// =============================================================================

/// 卡池配置
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCardPoolConfig {
    /// 公共展示区大小
    pub display_size: usize,
    
    /// 获取卡牌消耗的行动力
    pub acquire_cost: u32,
    
    /// 刷新卡池消耗的行动力
    pub refresh_cost: u32,
    
    /// 初始卡池大小
    pub initial_pool_size: usize,
}

impl Default for GcCardPoolConfig {
    fn default() -> Self {
        Self {
            display_size: 5,
            acquire_cost: 1,
            refresh_cost: 1,
            initial_pool_size: 50,
        }
    }
}

// =============================================================================
// 卡池状态
// =============================================================================

/// 公共卡池
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCardPool {
    /// 配置
    pub config: GcCardPoolConfig,
    
    /// 抽牌堆 (未展示的卡牌)
    pub draw_pile: Vec<GcCard>,
    
    /// 展示区 (玩家可选择获取的卡牌)
    pub display: Vec<GcCard>,
    
    /// 弃牌堆
    pub discard_pile: Vec<GcCard>,
}

impl GcCardPool {
    /// 创建新卡池
    pub fn gc_new(config: GcCardPoolConfig) -> Self {
        Self {
            config,
            draw_pile: Vec::new(),
            display: Vec::new(),
            discard_pile: Vec::new(),
        }
    }

    /// 使用默认配置创建卡池
    pub fn gc_default() -> Self {
        Self::gc_new(GcCardPoolConfig::default())
    }

    /// 初始化卡池 (生成初始卡牌并洗牌)
    pub fn gc_initialize(&mut self) {
        self.draw_pile = gc_generate_card_pool(self.config.initial_pool_size);
        self.gc_shuffle_draw_pile();
        self.gc_refill_display();
    }

    /// 洗牌
    pub fn gc_shuffle_draw_pile(&mut self) {
        let mut rng = thread_rng();
        self.draw_pile.shuffle(&mut rng);
    }

    /// 补充展示区
    pub fn gc_refill_display(&mut self) {
        while self.display.len() < self.config.display_size {
            if let Some(card) = self.draw_pile.pop() {
                self.display.push(card);
            } else if !self.discard_pile.is_empty() {
                // 弃牌堆洗入抽牌堆
                self.draw_pile.append(&mut self.discard_pile);
                self.gc_shuffle_draw_pile();
            } else {
                // 没有更多卡牌了
                break;
            }
        }
    }

    /// 获取卡牌 (从展示区移除并返回)
    pub fn gc_acquire_card(&mut self, card_id: &str) -> Option<GcCard> {
        if let Some(index) = self.display.iter().position(|c| c.id == card_id) {
            let card = self.display.remove(index);
            self.gc_refill_display();
            Some(card)
        } else {
            None
        }
    }

    /// 刷新展示区 (当前展示的卡牌放入弃牌堆)
    pub fn gc_refresh_display(&mut self) {
        self.discard_pile.append(&mut self.display);
        self.gc_refill_display();
    }

    /// 将卡牌放入弃牌堆
    pub fn gc_discard_card(&mut self, card: GcCard) {
        self.discard_pile.push(card);
    }

    /// 获取展示区卡牌
    pub fn gc_get_display(&self) -> &[GcCard] {
        &self.display
    }

    /// 剩余抽牌堆数量
    pub fn gc_draw_pile_count(&self) -> usize {
        self.draw_pile.len()
    }

    /// 弃牌堆数量
    pub fn gc_discard_pile_count(&self) -> usize {
        self.discard_pile.len()
    }
}

// =============================================================================
// 实现 GcCardAcquisition trait
// =============================================================================

impl GcCardAcquisition for GcCardPool {
    type Item = GcCard;
    
    fn acquire(&mut self, slot_index: usize, ctx: &mut GcAcquisitionContext) -> GcAcquisitionResult<Self::Item> {
        // 检查槽位有效性
        if slot_index >= self.display.len() {
            return GcAcquisitionResult::failure("无效槽位");
        }
        
        // 游戏王模式：检查行动力 (用 gold 字段代表行动力)
        let cost = self.config.acquire_cost;
        if !ctx.can_afford(cost) {
            return GcAcquisitionResult::failure("行动力不足");
        }
        
        // 扣除行动力
        ctx.spend(cost);
        
        // 获取卡牌
        let card = self.display.remove(slot_index);
        self.gc_refill_display();
        
        GcAcquisitionResult::success(card, cost)
    }
    
    fn can_acquire(&self, slot_index: usize, ctx: &GcAcquisitionContext) -> bool {
        slot_index < self.display.len() && ctx.can_afford(self.config.acquire_cost)
    }
    
    fn get_available_slots(&self) -> Vec<GcAcquisitionSlot> {
        self.display.iter()
            .enumerate()
            .map(|(i, card)| {
                GcAcquisitionSlot::new(
                    i,
                    &card.id,
                    &card.name,
                    self.config.acquire_cost,
                    1, // 游戏王模式没有星级概念
                ).with_description(&format!("{:?}", card.card_type))
            })
            .collect()
    }
    
    fn refresh(&mut self, ctx: &mut GcAcquisitionContext, free: bool) -> bool {
        let cost = if free { 0 } else { self.config.refresh_cost };
        
        if !free && !ctx.can_afford(cost) {
            return false;
        }
        
        if !free {
            ctx.spend(cost);
        }
        
        self.gc_refresh_display();
        true
    }
    
    fn refresh_cost(&self) -> u32 {
        self.config.refresh_cost
    }
    
    fn slot_count(&self) -> usize {
        self.config.display_size
    }
    
    fn mode_name(&self) -> &'static str {
        "决斗王模式"
    }
}

// =============================================================================
// 卡牌生成
// =============================================================================

/// 生成卡池 (类似旧代码的 generateCardPool)
pub fn gc_generate_card_pool(size: usize) -> Vec<GcCard> {
    let mut pool = Vec::with_capacity(size);
    let mut card_id = 0;

    // 40% 攻击卡 (伤害 5-15)
    let attack_count = size * 40 / 100;
    for i in 0..attack_count {
        let damage = 5 + (i % 3) * 5; // 5, 10, 15 循环
        pool.push(GcCard::gc_new_attack(
            &format!("pool_atk_{}", card_id),
            gc_attack_card_name(damage),
            1,
            damage as u32,
        ));
        card_id += 1;
    }

    // 25% 防御卡 (护盾 5-15)
    let defense_count = size * 25 / 100;
    for i in 0..defense_count {
        let shield = 5 + (i % 3) * 5;
        pool.push(GcCard::gc_new_defense(
            &format!("pool_def_{}", card_id),
            gc_defense_card_name(shield),
            1,
            shield as u32,
        ));
        card_id += 1;
    }

    // 20% 治疗卡 (恢复 3-10)
    let heal_count = size * 20 / 100;
    for i in 0..heal_count {
        let heal = 3 + (i % 3) * 3;
        pool.push(GcCard::gc_new_heal(
            &format!("pool_heal_{}", card_id),
            gc_heal_card_name(heal),
            1,
            heal as u32,
        ));
        card_id += 1;
    }

    // 15% 特殊卡
    let special_count = size - attack_count - defense_count - heal_count;
    for _ in 0..special_count {
        pool.push(GcCard::gc_new_special(
            &format!("pool_special_{}", card_id),
            "神秘卡牌",
            2,
        ));
        card_id += 1;
    }

    pool
}

/// 攻击卡名称
fn gc_attack_card_name(damage: usize) -> &'static str {
    match damage {
        0..=5 => "轻击",
        6..=10 => "斩击",
        11..=15 => "重击",
        _ => "致命一击",
    }
}

/// 防御卡名称
fn gc_defense_card_name(shield: usize) -> &'static str {
    match shield {
        0..=5 => "格挡",
        6..=10 => "防御姿态",
        11..=15 => "铁壁",
        _ => "无懈可击",
    }
}

/// 治疗卡名称
fn gc_heal_card_name(heal: usize) -> &'static str {
    match heal {
        0..=3 => "小治疗",
        4..=6 => "治愈术",
        7..=10 => "生命涌动",
        _ => "神圣治愈",
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcCardType;

    #[test]
    fn test_gc_card_pool_new() {
        let pool = GcCardPool::gc_default();
        assert_eq!(pool.config.display_size, 5);
        assert_eq!(pool.config.acquire_cost, 1);
    }

    #[test]
    fn test_gc_card_pool_initialize() {
        let mut pool = GcCardPool::gc_default();
        pool.gc_initialize();
        
        assert_eq!(pool.display.len(), 5);
        assert!(pool.draw_pile.len() > 0);
    }

    #[test]
    fn test_gc_acquire_card() {
        let mut pool = GcCardPool::gc_default();
        pool.gc_initialize();
        
        let first_card_id = pool.display[0].id.clone();
        let acquired = pool.gc_acquire_card(&first_card_id);
        
        assert!(acquired.is_some());
        assert_eq!(acquired.unwrap().id, first_card_id);
        assert_eq!(pool.display.len(), 5); // 自动补充
    }

    #[test]
    fn test_gc_generate_card_pool() {
        let pool = gc_generate_card_pool(50);
        assert_eq!(pool.len(), 50);
        
        let attack_count = pool.iter().filter(|c| matches!(c.card_type, GcCardType::Attack)).count();
        let defense_count = pool.iter().filter(|c| matches!(c.card_type, GcCardType::Defense)).count();
        
        assert!(attack_count >= 15); // 至少 30%
        assert!(defense_count >= 10); // 至少 20%
    }
}
