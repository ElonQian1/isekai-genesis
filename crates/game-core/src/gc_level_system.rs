//! 等级与槽位系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 槽位解锁规则
//! - Lv.1-2: 3 个战场槽位
//! - Lv.3-4: 4 个战场槽位
//! - Lv.5+:  5 个战场槽位
//!
//! ## 稀有度权重
//! 玩家等级越高，商店出现高星怪兽的概率越高

use serde::{Deserialize, Serialize};

// =============================================================================
// 槽位常量
// =============================================================================

/// 最小战场槽位数
pub const GC_MIN_BOARD_SLOTS: u8 = 3;

/// 最大战场槽位数
pub const GC_MAX_BOARD_SLOTS: u8 = 5;

/// 手牌区(备战席)无上限
pub const GC_BENCH_UNLIMITED: bool = true;

// =============================================================================
// 稀有度/星级定义
// =============================================================================

/// 怪兽稀有度/费用等级 (用于商店卡池)
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GcMonsterTier {
    /// 1费 (白色/普通)
    Tier1 = 1,
    /// 2费 (绿色/优秀)
    Tier2 = 2,
    /// 3费 (蓝色/精良)
    Tier3 = 3,
    /// 4费 (紫色/史诗)
    Tier4 = 4,
    /// 5费 (橙色/传说)
    Tier5 = 5,
}

impl GcMonsterTier {
    /// 获取该费用等级的购买价格
    pub fn cost(&self) -> u32 {
        match self {
            GcMonsterTier::Tier1 => 1,
            GcMonsterTier::Tier2 => 2,
            _ => 3, // 3费及以上都是3金
        }
    }
    
    /// 从数值创建
    pub fn from_u8(value: u8) -> Self {
        match value {
            1 => GcMonsterTier::Tier1,
            2 => GcMonsterTier::Tier2,
            3 => GcMonsterTier::Tier3,
            4 => GcMonsterTier::Tier4,
            _ => GcMonsterTier::Tier5,
        }
    }
}

// =============================================================================
// 等级槽位映射
// =============================================================================

/// 根据玩家等级获取战场槽位数
/// - Lv.1-2: 3 槽
/// - Lv.3-4: 4 槽
/// - Lv.5+:  5 槽
pub fn gc_get_board_slots(level: u8) -> u8 {
    match level {
        1..=2 => 3,
        3..=4 => 4,
        _ => 5,
    }
}

/// 根据玩家等级获取商店槽位数 (固定5个)
pub fn gc_get_shop_slots(_level: u8) -> u8 {
    5
}

// =============================================================================
// 稀有度权重表
// =============================================================================

/// 稀有度权重配置 (百分比, 总和应为100)
/// [Tier1%, Tier2%, Tier3%, Tier4%, Tier5%]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTierWeights {
    pub weights: [u8; 5],
}

impl GcTierWeights {
    /// 创建新的权重配置
    pub fn new(t1: u8, t2: u8, t3: u8, t4: u8, t5: u8) -> Self {
        Self { weights: [t1, t2, t3, t4, t5] }
    }
    
    /// 根据权重选择稀有度 (传入0-99的随机数)
    pub fn select_tier(&self, roll: u8) -> GcMonsterTier {
        let roll = roll % 100;
        let mut cumulative = 0u8;
        
        for (i, &weight) in self.weights.iter().enumerate() {
            cumulative += weight;
            if roll < cumulative {
                return GcMonsterTier::from_u8((i + 1) as u8);
            }
        }
        
        GcMonsterTier::Tier1 // 默认
    }
}

/// 各等级的稀有度权重表
/// 格式: [Tier1%, Tier2%, Tier3%, Tier4%, Tier5%]
pub fn gc_get_tier_weights(level: u8) -> GcTierWeights {
    match level {
        1 => GcTierWeights::new(100, 0, 0, 0, 0),     // Lv1: 100% T1
        2 => GcTierWeights::new(100, 0, 0, 0, 0),     // Lv2: 100% T1
        3 => GcTierWeights::new(75, 25, 0, 0, 0),     // Lv3: 75% T1, 25% T2
        4 => GcTierWeights::new(55, 30, 15, 0, 0),    // Lv4: 55% T1, 30% T2, 15% T3
        5 => GcTierWeights::new(45, 33, 20, 2, 0),    // Lv5: 45/33/20/2/0
        6 => GcTierWeights::new(30, 40, 25, 5, 0),    // Lv6: 30/40/25/5/0
        7 => GcTierWeights::new(19, 35, 35, 10, 1),   // Lv7: 19/35/35/10/1
        8 => GcTierWeights::new(16, 20, 35, 25, 4),   // Lv8: 16/20/35/25/4
        9 => GcTierWeights::new(10, 15, 30, 30, 15),  // Lv9: 10/15/30/30/15
        _ => GcTierWeights::new(5, 10, 20, 40, 25),   // Lv10: 5/10/20/40/25
    }
}

// =============================================================================
// 等级信息结构
// =============================================================================

/// 等级信息摘要
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcLevelInfo {
    /// 当前等级
    pub level: u8,
    /// 战场槽位数
    pub board_slots: u8,
    /// 商店槽位数
    pub shop_slots: u8,
    /// 稀有度权重
    pub tier_weights: GcTierWeights,
}

impl GcLevelInfo {
    /// 根据等级创建信息
    pub fn from_level(level: u8) -> Self {
        Self {
            level,
            board_slots: gc_get_board_slots(level),
            shop_slots: gc_get_shop_slots(level),
            tier_weights: gc_get_tier_weights(level),
        }
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_board_slots() {
        assert_eq!(gc_get_board_slots(1), 3);
        assert_eq!(gc_get_board_slots(2), 3);
        assert_eq!(gc_get_board_slots(3), 4);
        assert_eq!(gc_get_board_slots(4), 4);
        assert_eq!(gc_get_board_slots(5), 5);
        assert_eq!(gc_get_board_slots(10), 5);
    }
    
    #[test]
    fn test_tier_weights() {
        let weights = gc_get_tier_weights(1);
        assert_eq!(weights.weights[0], 100); // Lv1全是T1
        
        let weights = gc_get_tier_weights(5);
        assert!(weights.weights[3] > 0); // Lv5开始有T4
    }
    
    #[test]
    fn test_tier_selection() {
        let weights = GcTierWeights::new(50, 30, 20, 0, 0);
        
        assert_eq!(weights.select_tier(0), GcMonsterTier::Tier1);   // 0-49 -> T1
        assert_eq!(weights.select_tier(49), GcMonsterTier::Tier1);
        assert_eq!(weights.select_tier(50), GcMonsterTier::Tier2);  // 50-79 -> T2
        assert_eq!(weights.select_tier(80), GcMonsterTier::Tier3);  // 80-99 -> T3
    }
}
