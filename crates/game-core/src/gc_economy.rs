//! 金币经济系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 经济规则
//! - 每回合基础收入: 5金
//! - 利息: 每10金存款+1金, 上限5金
//! - 连胜/连败奖励: 1-3金
//! - 刷新商店: 2金
//! - 升级费用: 4金/次

use serde::{Deserialize, Serialize};

// =============================================================================
// 常量定义
// =============================================================================

/// 基础每回合收入
pub const GC_BASE_INCOME: u32 = 5;

/// 刷新商店费用
pub const GC_REFRESH_COST: u32 = 2;

/// 利息比率 (每10金+1金)
pub const GC_INTEREST_RATE: u32 = 10;

/// 利息上限
pub const GC_INTEREST_CAP: u32 = 5;

/// 升级费用
pub const GC_LEVEL_UP_COST: u32 = 4;

/// 初始金币
pub const GC_STARTING_GOLD: u32 = 3;

/// 初始等级
pub const GC_STARTING_LEVEL: u8 = 1;

/// 最大等级
pub const GC_MAX_LEVEL: u8 = 10;

/// 各等级升级所需经验值
pub const GC_LEVEL_XP_TABLE: [u32; 10] = [
    0,   // Lv1 -> Lv2: 不需要XP直接升级(或2XP)
    2,   // Lv2 -> Lv3
    6,   // Lv3 -> Lv4
    10,  // Lv4 -> Lv5
    20,  // Lv5 -> Lv6
    36,  // Lv6 -> Lv7
    56,  // Lv7 -> Lv8
    80,  // Lv8 -> Lv9
    100, // Lv9 -> Lv10
    999, // Lv10 (满级)
];

/// 连胜/连败奖励表
pub const GC_STREAK_BONUS: [u32; 8] = [
    0, // 0连
    0, // 1连
    1, // 2连
    1, // 3连
    2, // 4连
    2, // 5连
    3, // 6连
    3, // 7+连
];

// =============================================================================
// 经济状态结构
// =============================================================================

/// 玩家经济状态
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEconomy {
    /// 当前金币
    pub gold: u32,
    /// 当前等级 (1-10)
    pub level: u8,
    /// 当前经验值
    pub xp: u32,
    /// 连胜次数 (正数=连胜, 0=无连续)
    pub win_streak: u8,
    /// 连败次数
    pub lose_streak: u8,
    /// 本回合是否已领取收入
    pub income_collected: bool,
}

impl Default for GcEconomy {
    fn default() -> Self {
        Self {
            gold: GC_STARTING_GOLD,
            level: GC_STARTING_LEVEL,
            xp: 0,
            win_streak: 0,
            lose_streak: 0,
            income_collected: false,
        }
    }
}

impl GcEconomy {
    /// 创建新的经济状态
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 创建指定初始金币的经济状态
    pub fn with_gold(gold: u32) -> Self {
        Self {
            gold,
            ..Default::default()
        }
    }
    
    // =========================================================================
    // 金币操作
    // =========================================================================
    
    /// 是否能支付指定金额
    pub fn can_afford(&self, cost: u32) -> bool {
        self.gold >= cost
    }
    
    /// 消费金币 (返回是否成功)
    pub fn spend(&mut self, cost: u32) -> bool {
        if self.can_afford(cost) {
            self.gold -= cost;
            true
        } else {
            false
        }
    }
    
    /// 获得金币
    pub fn earn(&mut self, amount: u32) {
        self.gold += amount;
    }
    
    /// 设置金币 (用于测试或特殊情况)
    pub fn set_gold(&mut self, amount: u32) {
        self.gold = amount;
    }
    
    // =========================================================================
    // 收入计算
    // =========================================================================
    
    /// 计算利息收入 (每10金+1金, 上限5金)
    pub fn calculate_interest(&self) -> u32 {
        (self.gold / GC_INTEREST_RATE).min(GC_INTEREST_CAP)
    }
    
    /// 计算连胜/连败奖励
    pub fn calculate_streak_bonus(&self) -> u32 {
        let streak = self.win_streak.max(self.lose_streak) as usize;
        if streak >= GC_STREAK_BONUS.len() {
            GC_STREAK_BONUS[GC_STREAK_BONUS.len() - 1]
        } else {
            GC_STREAK_BONUS[streak]
        }
    }
    
    /// 计算本回合总收入
    pub fn calculate_total_income(&self) -> u32 {
        GC_BASE_INCOME + self.calculate_interest() + self.calculate_streak_bonus()
    }
    
    /// 领取回合收入
    pub fn collect_income(&mut self) -> u32 {
        if self.income_collected {
            return 0;
        }
        
        let income = self.calculate_total_income();
        self.gold += income;
        self.income_collected = true;
        income
    }
    
    /// 重置回合状态 (新回合开始时调用)
    pub fn start_new_turn(&mut self) {
        self.income_collected = false;
    }
    
    // =========================================================================
    // 等级系统
    // =========================================================================
    
    /// 获取当前等级升级所需经验
    pub fn xp_to_next_level(&self) -> u32 {
        if self.level as usize >= GC_LEVEL_XP_TABLE.len() {
            return 999;
        }
        GC_LEVEL_XP_TABLE[self.level as usize]
    }
    
    /// 是否可以升级 (有足够金币)
    pub fn can_level_up(&self) -> bool {
        self.level < GC_MAX_LEVEL && self.can_afford(GC_LEVEL_UP_COST)
    }
    
    /// 购买经验 (消耗4金获得4经验)
    pub fn buy_xp(&mut self) -> bool {
        if !self.can_afford(GC_LEVEL_UP_COST) {
            return false;
        }
        
        self.spend(GC_LEVEL_UP_COST);
        self.add_xp(GC_LEVEL_UP_COST);
        true
    }
    
    /// 增加经验值 (可能触发升级)
    pub fn add_xp(&mut self, amount: u32) {
        self.xp += amount;
        
        // 检查是否升级
        while self.level < GC_MAX_LEVEL && self.xp >= self.xp_to_next_level() {
            self.xp -= self.xp_to_next_level();
            self.level += 1;
        }
    }
    
    /// 获取等级进度 (0.0 - 1.0)
    pub fn level_progress(&self) -> f32 {
        let needed = self.xp_to_next_level();
        if needed == 0 || needed == 999 {
            return 1.0;
        }
        self.xp as f32 / needed as f32
    }
    
    // =========================================================================
    // 战斗结果处理
    // =========================================================================
    
    /// 记录胜利
    pub fn record_win(&mut self) {
        self.win_streak += 1;
        self.lose_streak = 0;
    }
    
    /// 记录失败
    pub fn record_loss(&mut self) {
        self.lose_streak += 1;
        self.win_streak = 0;
    }
    
    /// 记录平局
    pub fn record_draw(&mut self) {
        // 平局不影响连胜/连败
    }
    
    // =========================================================================
    // 商店操作
    // =========================================================================
    
    /// 是否能刷新商店
    pub fn can_refresh_shop(&self) -> bool {
        self.can_afford(GC_REFRESH_COST)
    }
    
    /// 支付刷新商店费用
    pub fn pay_refresh(&mut self) -> bool {
        self.spend(GC_REFRESH_COST)
    }
    
    // =========================================================================
    // 调试与显示
    // =========================================================================
    
    /// 获取经济状态摘要
    pub fn summary(&self) -> String {
        format!(
            "💰{} | Lv.{} ({}/{}) | 连胜:{} 连败:{}",
            self.gold,
            self.level,
            self.xp,
            self.xp_to_next_level(),
            self.win_streak,
            self.lose_streak
        )
    }
}

// =============================================================================
// 辅助函数
// =============================================================================

/// 计算怪兽购买价格 (1★=1金, 2★=2金, 3★+=3金)
pub fn gc_monster_buy_price(star: u8) -> u32 {
    match star {
        1 => 1,
        2 => 2,
        _ => 3,
    }
}

/// 计算怪兽卖出价格
/// - 1★=1金, 2★=2金, 3★=3金
/// - 金色LvN = 3 + N×3 金
pub fn gc_monster_sell_price(star: u8, golden_level: u8) -> u32 {
    if golden_level > 0 {
        3 + golden_level as u32 * 3
    } else {
        star as u32
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_economy_basics() {
        let mut eco = GcEconomy::new();
        assert_eq!(eco.gold, GC_STARTING_GOLD);
        
        eco.earn(10);
        assert_eq!(eco.gold, GC_STARTING_GOLD + 10);
        
        assert!(eco.spend(5));
        assert_eq!(eco.gold, GC_STARTING_GOLD + 5);
        
        assert!(!eco.spend(100)); // 余额不足
    }
    
    #[test]
    fn test_interest_calculation() {
        let mut eco = GcEconomy::new();
        eco.set_gold(50);
        
        assert_eq!(eco.calculate_interest(), 5); // 50/10 = 5, 刚好上限
        
        eco.set_gold(100);
        assert_eq!(eco.calculate_interest(), 5); // 100/10 = 10, 但上限5
        
        eco.set_gold(25);
        assert_eq!(eco.calculate_interest(), 2); // 25/10 = 2
    }
    
    #[test]
    fn test_level_up() {
        let mut eco = GcEconomy::new();
        eco.set_gold(20);
        
        assert!(eco.buy_xp()); // 4金换4经验
        assert_eq!(eco.gold, 16);
        
        // 购买经验后应该有经验值或已升级
        // Lv1->Lv2 需要的经验在表中是0, 所以会立即升级
        // 剩余经验会保留
        assert!(eco.level >= 2 || eco.xp > 0);
    }
    
    #[test]
    fn test_streak_bonus() {
        let mut eco = GcEconomy::new();
        
        eco.record_win();
        eco.record_win();
        assert_eq!(eco.win_streak, 2);
        assert_eq!(eco.calculate_streak_bonus(), 1);
        
        eco.record_loss();
        assert_eq!(eco.win_streak, 0);
        assert_eq!(eco.lose_streak, 1);
    }
    
    #[test]
    fn test_monster_prices() {
        assert_eq!(gc_monster_buy_price(1), 1);
        assert_eq!(gc_monster_buy_price(2), 2);
        assert_eq!(gc_monster_buy_price(3), 3);
        
        assert_eq!(gc_monster_sell_price(1, 0), 1);
        assert_eq!(gc_monster_sell_price(3, 0), 3);
        assert_eq!(gc_monster_sell_price(3, 1), 6); // 金色Lv1
        assert_eq!(gc_monster_sell_price(3, 2), 9); // 金色Lv2
    }
}
