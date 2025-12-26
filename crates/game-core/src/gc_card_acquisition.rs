//! 抽卡接口抽象层
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 设计目标
//! 统一 `GcCardPool` (游戏王模式) 和 `GcTavernShop` (酒馆模式) 的抽卡接口，
//! 支持运行时动态切换抽卡方式。
//!
//! ## 使用方式
//! ```ignore
//! // 根据游戏模式选择抽卡系统
//! let acquisition: Box<dyn GcCardAcquisition<Item = GcMonster>> = match mode {
//!     GcGameMode::YuGiOhStyle => Box::new(card_pool_adapter),
//!     GcGameMode::TavernStyle => Box::new(tavern_shop),
//! };
//! ```

use serde::{Deserialize, Serialize};

// =============================================================================
// 抽卡上下文
// =============================================================================

/// 抽卡操作上下文
/// 
/// 包含执行抽卡操作所需的外部依赖（经济系统、随机数等）
#[derive(Default)]
pub struct GcAcquisitionContext {
    /// 当前金币数 (酒馆模式使用)
    pub gold: u32,
    /// 消耗的金币 (操作后填充)
    pub gold_spent: u32,
    /// 随机数种子 (用于刷新)
    pub random_rolls: Vec<u8>,
    /// 玩家等级 (影响卡池权重)
    pub player_level: u8,
}

impl GcAcquisitionContext {
    /// 创建空上下文
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 创建带金币的上下文
    pub fn with_gold(gold: u32) -> Self {
        Self {
            gold,
            ..Default::default()
        }
    }
    
    /// 创建完整上下文
    pub fn full(gold: u32, player_level: u8, random_rolls: Vec<u8>) -> Self {
        Self {
            gold,
            gold_spent: 0,
            random_rolls,
            player_level,
        }
    }
    
    /// 检查是否能支付指定金额
    pub fn can_afford(&self, cost: u32) -> bool {
        self.gold >= cost
    }
    
    /// 扣除金币
    pub fn spend(&mut self, cost: u32) -> bool {
        if self.can_afford(cost) {
            self.gold -= cost;
            self.gold_spent += cost;
            true
        } else {
            false
        }
    }
}

// =============================================================================
// 展示槽位信息
// =============================================================================

/// 抽卡槽位信息 (用于统一展示)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcAcquisitionSlot {
    /// 槽位索引
    pub index: usize,
    /// 物品ID
    pub item_id: String,
    /// 物品名称
    pub name: String,
    /// 获取费用
    pub cost: u32,
    /// 是否被冻结 (酒馆模式)
    pub frozen: bool,
    /// 稀有度/星级
    pub tier: u8,
    /// 额外描述信息
    pub description: Option<String>,
}

impl GcAcquisitionSlot {
    /// 创建新槽位
    pub fn new(index: usize, item_id: &str, name: &str, cost: u32, tier: u8) -> Self {
        Self {
            index,
            item_id: item_id.to_string(),
            name: name.to_string(),
            cost,
            frozen: false,
            tier,
            description: None,
        }
    }
    
    /// 设置冻结状态
    pub fn with_frozen(mut self, frozen: bool) -> Self {
        self.frozen = frozen;
        self
    }
    
    /// 设置描述
    pub fn with_description(mut self, desc: &str) -> Self {
        self.description = Some(desc.to_string());
        self
    }
}

// =============================================================================
// 抽卡结果
// =============================================================================

/// 抽卡操作结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcAcquisitionResult<T> {
    /// 是否成功
    pub success: bool,
    /// 获取的物品 (如果成功)
    pub item: Option<T>,
    /// 消耗的金币
    pub cost: u32,
    /// 错误信息 (如果失败)
    pub error: Option<String>,
}

impl<T> GcAcquisitionResult<T> {
    /// 创建成功结果
    pub fn success(item: T, cost: u32) -> Self {
        Self {
            success: true,
            item: Some(item),
            cost,
            error: None,
        }
    }
    
    /// 创建失败结果
    pub fn failure(error: &str) -> Self {
        Self {
            success: false,
            item: None,
            cost: 0,
            error: Some(error.to_string()),
        }
    }
}

// =============================================================================
// 核心 Trait 定义
// =============================================================================

/// 抽卡系统接口
/// 
/// 统一游戏王模式 (GcCardPool) 和酒馆模式 (GcTavernShop) 的抽卡行为
pub trait GcCardAcquisition {
    /// 获取的物品类型
    type Item: Clone;
    
    /// 获取物品 (通过槽位索引)
    /// 
    /// # 参数
    /// - `slot_index`: 槽位索引
    /// - `ctx`: 抽卡上下文 (包含金币等信息)
    /// 
    /// # 返回
    /// 操作结果，包含获取的物品或错误信息
    fn acquire(&mut self, slot_index: usize, ctx: &mut GcAcquisitionContext) -> GcAcquisitionResult<Self::Item>;
    
    /// 检查是否可以获取指定槽位的物品
    fn can_acquire(&self, slot_index: usize, ctx: &GcAcquisitionContext) -> bool;
    
    /// 获取所有可用槽位的信息
    fn get_available_slots(&self) -> Vec<GcAcquisitionSlot>;
    
    /// 刷新可用物品
    /// 
    /// # 参数
    /// - `ctx`: 抽卡上下文
    /// - `free`: 是否免费刷新 (回合开始时)
    /// 
    /// # 返回
    /// 是否成功刷新
    fn refresh(&mut self, ctx: &mut GcAcquisitionContext, free: bool) -> bool;
    
    /// 获取刷新费用 (0 = 免费)
    fn refresh_cost(&self) -> u32;
    
    /// 获取槽位数量
    fn slot_count(&self) -> usize;
    
    /// 冻结/解冻槽位 (酒馆模式特有，游戏王模式返回 false)
    fn toggle_freeze(&mut self, _slot_index: usize) -> bool {
        false
    }
    
    /// 检查槽位是否被冻结
    fn is_frozen(&self, _slot_index: usize) -> bool {
        false
    }
    
    /// 获取模式名称
    fn mode_name(&self) -> &'static str;
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_acquisition_context() {
        let mut ctx = GcAcquisitionContext::with_gold(10);
        
        assert!(ctx.can_afford(5));
        assert!(ctx.can_afford(10));
        assert!(!ctx.can_afford(11));
        
        assert!(ctx.spend(3));
        assert_eq!(ctx.gold, 7);
        assert_eq!(ctx.gold_spent, 3);
        
        assert!(!ctx.spend(10)); // 金币不足
        assert_eq!(ctx.gold, 7); // 金币未变
    }
    
    #[test]
    fn test_acquisition_slot() {
        let slot = GcAcquisitionSlot::new(0, "monster_1", "火龙", 3, 2)
            .with_frozen(true)
            .with_description("强力火属性怪兽");
        
        assert_eq!(slot.index, 0);
        assert_eq!(slot.cost, 3);
        assert!(slot.frozen);
        assert!(slot.description.is_some());
    }
    
    #[test]
    fn test_acquisition_result() {
        let success: GcAcquisitionResult<String> = GcAcquisitionResult::success("物品".to_string(), 2);
        assert!(success.success);
        assert_eq!(success.cost, 2);
        
        let failure: GcAcquisitionResult<String> = GcAcquisitionResult::failure("金币不足");
        assert!(!failure.success);
        assert!(failure.error.is_some());
    }
}
