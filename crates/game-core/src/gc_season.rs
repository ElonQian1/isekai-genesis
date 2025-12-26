//! 赛季与游戏模式系统
//!
//! 模块: game-core
//! 前缀: Gc
//!
//! ## 游戏模式
//! - YuGiOhStyle: 游戏王模式 (传统抽卡)
//! - TavernStyle: 酒馆模式 (商店购买)
//!
//! ## 赛季规则
//! - 每个赛季限定可用的游戏模式
//! - 战斗开始前选择模式，战斗中不可切换
//! - 部分赛季可能只开放单一模式

use serde::{Deserialize, Serialize};

// =============================================================================
// 游戏模式
// =============================================================================

/// 游戏模式
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GcGameMode {
    /// 游戏王模式: 传统卡组抽卡、祭品召唤
    YuGiOhStyle,
    /// 酒馆模式: 商店购买、3合1升星、自动战斗
    TavernStyle,
}

impl GcGameMode {
    /// 获取模式名称
    pub fn name(&self) -> &'static str {
        match self {
            GcGameMode::YuGiOhStyle => "决斗王",
            GcGameMode::TavernStyle => "酒馆战棋",
        }
    }
    
    /// 获取模式描述
    pub fn description(&self) -> &'static str {
        match self {
            GcGameMode::YuGiOhStyle => "经典卡牌对战，从卡组抽卡，使用祭品召唤高星怪兽",
            GcGameMode::TavernStyle => "酒馆自走棋，购买怪兽，3合1升星，全自动战斗",
        }
    }
    
    /// 获取模式图标
    pub fn icon(&self) -> &'static str {
        match self {
            GcGameMode::YuGiOhStyle => "🃏",
            GcGameMode::TavernStyle => "🍺",
        }
    }
    
    /// 是否支持手动攻击
    pub fn allows_manual_attack(&self) -> bool {
        match self {
            GcGameMode::YuGiOhStyle => true,
            GcGameMode::TavernStyle => false, // 默认自动，特殊技能除外
        }
    }
    
    /// 是否有商店系统
    pub fn has_shop(&self) -> bool {
        matches!(self, GcGameMode::TavernStyle)
    }
    
    /// 是否有合成系统
    pub fn has_merge(&self) -> bool {
        matches!(self, GcGameMode::TavernStyle)
    }
    
    /// 是否有祭品召唤
    pub fn has_tribute_summon(&self) -> bool {
        matches!(self, GcGameMode::YuGiOhStyle)
    }
}

impl Default for GcGameMode {
    fn default() -> Self {
        GcGameMode::YuGiOhStyle
    }
}

// =============================================================================
// 赛季定义
// =============================================================================

/// 赛季信息
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcSeason {
    /// 赛季ID
    pub id: String,
    /// 赛季名称
    pub name: String,
    /// 赛季描述
    pub description: String,
    /// 赛季主题图标
    pub icon: String,
    /// 允许的游戏模式
    pub allowed_modes: Vec<GcGameMode>,
    /// 赛季开始时间 (Unix 时间戳)
    pub start_time: u64,
    /// 赛季结束时间 (Unix 时间戳)
    pub end_time: u64,
    /// 是否为当前激活的赛季
    pub is_active: bool,
}

impl GcSeason {
    /// 创建新赛季
    pub fn new(
        id: &str,
        name: &str,
        description: &str,
        icon: &str,
        allowed_modes: Vec<GcGameMode>,
        start_time: u64,
        end_time: u64,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            icon: icon.to_string(),
            allowed_modes,
            start_time,
            end_time,
            is_active: false,
        }
    }
    
    /// 检查模式是否在本赛季可用
    pub fn is_mode_available(&self, mode: GcGameMode) -> bool {
        self.allowed_modes.contains(&mode)
    }
    
    /// 检查赛季是否在指定时间内
    pub fn is_within_time(&self, current_time: u64) -> bool {
        current_time >= self.start_time && current_time < self.end_time
    }
    
    /// 获取赛季剩余时间 (秒)
    pub fn remaining_time(&self, current_time: u64) -> u64 {
        if current_time >= self.end_time {
            0
        } else {
            self.end_time - current_time
        }
    }
    
    /// 获取赛季进度 (0.0 - 1.0)
    pub fn progress(&self, current_time: u64) -> f32 {
        let duration = self.end_time - self.start_time;
        if duration == 0 {
            return 1.0;
        }
        
        let elapsed = current_time.saturating_sub(self.start_time);
        (elapsed as f32 / duration as f32).min(1.0)
    }
}

// =============================================================================
// 赛季管理器
// =============================================================================

/// 赛季管理器
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GcSeasonManager {
    /// 所有赛季列表
    seasons: Vec<GcSeason>,
    /// 当前赛季索引
    current_season_index: Option<usize>,
}

impl GcSeasonManager {
    /// 创建新的赛季管理器
    pub fn new() -> Self {
        Self::default()
    }
    
    /// 创建带默认赛季的管理器
    pub fn with_defaults() -> Self {
        let mut manager = Self::new();
        manager.add_default_seasons();
        manager
    }
    
    /// 添加默认赛季
    pub fn add_default_seasons(&mut self) {
        // 赛季1: 双模式开放
        self.add_season(GcSeason::new(
            "s1",
            "创世赛季",
            "双模式同时开放，自由选择你的战斗方式",
            "🌟",
            vec![GcGameMode::YuGiOhStyle, GcGameMode::TavernStyle],
            0,
            u64::MAX, // 永久
        ));
        
        // 赛季2: 仅酒馆模式
        self.add_season(GcSeason::new(
            "s2_tavern",
            "酒馆狂欢",
            "本赛季仅开放酒馆战棋模式",
            "🍺",
            vec![GcGameMode::TavernStyle],
            0,
            u64::MAX,
        ));
        
        // 赛季3: 仅决斗模式
        self.add_season(GcSeason::new(
            "s3_duel",
            "决斗者之路",
            "本赛季仅开放经典决斗模式",
            "🃏",
            vec![GcGameMode::YuGiOhStyle],
            0,
            u64::MAX,
        ));
        
        // 默认激活第一个赛季
        if !self.seasons.is_empty() {
            self.set_active_season(0);
        }
    }
    
    /// 添加赛季
    pub fn add_season(&mut self, season: GcSeason) {
        self.seasons.push(season);
    }
    
    /// 设置当前激活的赛季
    pub fn set_active_season(&mut self, index: usize) -> bool {
        if index >= self.seasons.len() {
            return false;
        }
        
        // 取消之前的激活状态
        if let Some(old_idx) = self.current_season_index {
            if let Some(old_season) = self.seasons.get_mut(old_idx) {
                old_season.is_active = false;
            }
        }
        
        // 激活新赛季
        self.seasons[index].is_active = true;
        self.current_season_index = Some(index);
        true
    }
    
    /// 按ID设置激活赛季
    pub fn set_active_season_by_id(&mut self, id: &str) -> bool {
        if let Some(idx) = self.seasons.iter().position(|s| s.id == id) {
            self.set_active_season(idx)
        } else {
            false
        }
    }
    
    /// 获取当前赛季
    pub fn current_season(&self) -> Option<&GcSeason> {
        self.current_season_index.and_then(|idx| self.seasons.get(idx))
    }
    
    /// 获取当前赛季可用模式
    pub fn available_modes(&self) -> Vec<GcGameMode> {
        self.current_season()
            .map(|s| s.allowed_modes.clone())
            .unwrap_or_else(|| vec![GcGameMode::YuGiOhStyle, GcGameMode::TavernStyle])
    }
    
    /// 检查模式是否在当前赛季可用
    pub fn is_mode_available(&self, mode: GcGameMode) -> bool {
        self.current_season()
            .map(|s| s.is_mode_available(mode))
            .unwrap_or(true)
    }
    
    /// 获取所有赛季
    pub fn all_seasons(&self) -> &[GcSeason] {
        &self.seasons
    }
    
    /// 根据时间自动选择赛季
    pub fn auto_select_by_time(&mut self, current_time: u64) {
        for (idx, season) in self.seasons.iter().enumerate() {
            if season.is_within_time(current_time) {
                self.set_active_season(idx);
                return;
            }
        }
    }
}

// =============================================================================
// 回合阶段 (模式相关)
// =============================================================================

/// 游戏王模式回合阶段
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcYuGiOhPhase {
    /// 抽牌阶段
    Draw,
    /// 主阶段1
    Main1,
    /// 战斗阶段
    Battle,
    /// 主阶段2
    Main2,
    /// 结束阶段
    End,
}

/// 酒馆模式回合阶段
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcTavernPhase {
    /// 购物阶段: 购买/卖出/刷新/升级
    Shopping,
    /// 部署阶段: 从手牌部署到战场
    Deploy,
    /// 战斗阶段: 自动战斗
    Combat,
    /// 结算阶段: 显示结果
    Result,
}

/// 统一的回合阶段
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcPhase {
    YuGiOh(GcYuGiOhPhase),
    Tavern(GcTavernPhase),
}

impl GcPhase {
    /// 获取阶段名称
    pub fn name(&self) -> &'static str {
        match self {
            GcPhase::YuGiOh(p) => match p {
                GcYuGiOhPhase::Draw => "抽牌阶段",
                GcYuGiOhPhase::Main1 => "主阶段1",
                GcYuGiOhPhase::Battle => "战斗阶段",
                GcYuGiOhPhase::Main2 => "主阶段2",
                GcYuGiOhPhase::End => "结束阶段",
            },
            GcPhase::Tavern(p) => match p {
                GcTavernPhase::Shopping => "购物阶段",
                GcTavernPhase::Deploy => "部署阶段",
                GcTavernPhase::Combat => "战斗阶段",
                GcTavernPhase::Result => "结算阶段",
            },
        }
    }
    
    /// 是否允许购买操作
    pub fn allows_shopping(&self) -> bool {
        matches!(self, GcPhase::Tavern(GcTavernPhase::Shopping))
    }
    
    /// 是否允许部署操作
    pub fn allows_deploy(&self) -> bool {
        matches!(
            self,
            GcPhase::YuGiOh(GcYuGiOhPhase::Main1 | GcYuGiOhPhase::Main2) 
            | GcPhase::Tavern(GcTavernPhase::Shopping | GcTavernPhase::Deploy)
        )
    }
    
    /// 是否为战斗阶段
    pub fn is_combat(&self) -> bool {
        matches!(
            self,
            GcPhase::YuGiOh(GcYuGiOhPhase::Battle) | GcPhase::Tavern(GcTavernPhase::Combat)
        )
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_game_mode() {
        let mode = GcGameMode::TavernStyle;
        assert!(mode.has_shop());
        assert!(mode.has_merge());
        assert!(!mode.has_tribute_summon());
        
        let mode = GcGameMode::YuGiOhStyle;
        assert!(!mode.has_shop());
        assert!(mode.has_tribute_summon());
    }
    
    #[test]
    fn test_season_manager() {
        let mut manager = GcSeasonManager::with_defaults();
        
        assert!(manager.current_season().is_some());
        assert!(manager.is_mode_available(GcGameMode::YuGiOhStyle));
        assert!(manager.is_mode_available(GcGameMode::TavernStyle));
        
        // 切换到仅酒馆赛季
        manager.set_active_season_by_id("s2_tavern");
        assert!(manager.is_mode_available(GcGameMode::TavernStyle));
        assert!(!manager.is_mode_available(GcGameMode::YuGiOhStyle));
    }
    
    #[test]
    fn test_phase() {
        let phase = GcPhase::Tavern(GcTavernPhase::Shopping);
        assert!(phase.allows_shopping());
        assert!(phase.allows_deploy());
        assert!(!phase.is_combat());
        
        let phase = GcPhase::Tavern(GcTavernPhase::Combat);
        assert!(!phase.allows_shopping());
        assert!(phase.is_combat());
    }
}
