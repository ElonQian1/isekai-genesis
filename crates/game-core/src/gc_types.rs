//! 核心类型定义
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};

// =============================================================================
// 存档版本系统
// =============================================================================

/// 当前存档版本
pub const GC_SAVE_VERSION: GcSaveVersion = GcSaveVersion {
    major: 2,
    minor: 0,
    patch: 0,
};

/// 存档版本号
/// 
/// 版本规则:
/// - major: 不兼容的重大变更，需要重置存档
/// - minor: 新增功能，可自动迁移
/// - patch: Bug修复，完全兼容
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct GcSaveVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

impl GcSaveVersion {
    /// 创建新版本号
    pub fn new(major: u32, minor: u32, patch: u32) -> Self {
        Self { major, minor, patch }
    }

    /// 检查是否兼容（同 major 版本可迁移）
    pub fn is_compatible_with(&self, other: &GcSaveVersion) -> bool {
        self.major == other.major
    }

    /// 检查是否需要迁移
    pub fn needs_migration(&self, target: &GcSaveVersion) -> bool {
        self.major == target.major && (self.minor < target.minor || self.patch < target.patch)
    }

    /// 检查是否需要重置（major 版本不同）
    pub fn needs_reset(&self, target: &GcSaveVersion) -> bool {
        self.major != target.major
    }
}

impl Default for GcSaveVersion {
    fn default() -> Self {
        GC_SAVE_VERSION
    }
}

impl std::fmt::Display for GcSaveVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)
    }
}

/// 存档迁移结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GcMigrationResult {
    /// 无需迁移，版本相同
    NoMigrationNeeded,
    /// 迁移成功
    MigrationSuccess { from: GcSaveVersion, to: GcSaveVersion },
    /// 需要重置存档（major 版本不兼容）
    ResetRequired { old_version: GcSaveVersion, current_version: GcSaveVersion },
}

// =============================================================================
// 游戏配置
// =============================================================================

/// 游戏常量配置
pub struct GcConfig;

impl GcConfig {
    /// 最大手牌数量
    pub const MAX_HAND_SIZE: usize = 10;
    
    /// 默认生命值
    pub const DEFAULT_HP: u32 = 100;
    
    /// 默认攻击力
    pub const DEFAULT_ATTACK: u32 = 10;
    
    /// 默认防御力
    pub const DEFAULT_DEFENSE: u32 = 5;
    
    /// 默认能量
    pub const DEFAULT_ENERGY: u32 = 3;
    
    /// 每回合抽牌数
    pub const DRAW_PER_TURN: usize = 1;
    
    /// 回合时间限制 (秒)
    pub const TURN_TIME_LIMIT: u32 = 60;
}

// =============================================================================
// 通用 ID 类型
// =============================================================================

/// 玩家 ID
pub type GcPlayerId = String;

/// 卡牌 ID (实例)
pub type GcCardId = String;

/// 卡牌模板 ID
pub type GcCardTemplateId = String;

/// 战斗 ID
pub type GcBattleId = String;

/// 房间 ID
pub type GcRoomId = String;

// =============================================================================
// 属性系统
// =============================================================================

/// 基础属性类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GcStatType {
    /// 力量 (增加物理攻击)
    Strength,
    /// 敏捷 (增加暴击和闪避)
    Agility,
    /// 智力 (增加魔法攻击和魔力)
    Intelligence,
    /// 体质 (增加生命值)
    Vitality,
}

impl GcStatType {
    pub fn gc_name(&self) -> &'static str {
        match self {
            GcStatType::Strength => "力量",
            GcStatType::Agility => "敏捷",
            GcStatType::Intelligence => "智力",
            GcStatType::Vitality => "体质",
        }
    }
}

/// 基础属性集合
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct GcBaseStats {
    pub strength: u32,
    pub agility: u32,
    pub intelligence: u32,
    pub vitality: u32,
}

impl GcBaseStats {
    pub fn gc_merge(&mut self, other: &GcBaseStats) {
        self.strength += other.strength;
        self.agility += other.agility;
        self.intelligence += other.intelligence;
        self.vitality += other.vitality;
    }

    pub fn gc_add(&mut self, stat_type: GcStatType, value: i32) {
        let v = value.max(0) as u32;
        match stat_type {
            GcStatType::Strength => self.strength += v,
            GcStatType::Agility => self.agility += v,
            GcStatType::Intelligence => self.intelligence += v,
            GcStatType::Vitality => self.vitality += v,
        }
    }
}

/// 战斗属性集合
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct GcCombatStats {
    pub attack: u32,
    pub defense: u32,
    pub max_hp: u32,
    pub max_energy: u32,
    pub crit_rate: u32,     // 万分比
    pub crit_damage: u32,   // 万分比
    pub dodge_rate: u32,    // 万分比
    pub hit_rate: u32,      // 万分比
    pub physical_attack: u32,
    pub magic_attack: u32,
    pub physical_defense: u32,
    pub magic_defense: u32,
    pub healing_bonus: u32,
    pub cooldown_reduction: u32,
}

impl GcCombatStats {
    pub fn gc_merge(&mut self, other: &GcCombatStats) {
        self.attack += other.attack;
        self.defense += other.defense;
        self.max_hp += other.max_hp;
        self.max_energy += other.max_energy;
        self.crit_rate += other.crit_rate;
        self.crit_damage += other.crit_damage;
        self.dodge_rate += other.dodge_rate;
        self.hit_rate += other.hit_rate;
        self.physical_attack += other.physical_attack;
        self.magic_attack += other.magic_attack;
        self.physical_defense += other.physical_defense;
        self.magic_defense += other.magic_defense;
        self.healing_bonus += other.healing_bonus;
        self.cooldown_reduction += other.cooldown_reduction;
    }

    pub fn gc_from_base_stats(base: &GcBaseStats, _level: u32) -> Self {
        let mut stats = Self::default();
        stats.max_hp = base.vitality * 10;
        stats.physical_attack = base.strength * 2;
        stats.magic_attack = base.intelligence * 2;
        stats.physical_defense = base.strength;
        stats.magic_defense = base.intelligence;
        stats.crit_rate = base.agility * 10;
        stats.dodge_rate = base.agility * 5;
        stats.max_energy = 3;
        
        // Derived generic stats
        stats.attack = stats.physical_attack.max(stats.magic_attack);
        stats.defense = stats.physical_defense.max(stats.magic_defense);
        
        stats
    }
}

// =============================================================================
// 伤害计算结果
// =============================================================================

/// 伤害计算结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcDamageResult {
    /// 原始伤害 (攻击力 + 卡牌伤害)
    pub raw_damage: u32,
    
    /// 被减免的伤害
    pub reduced_damage: u32,
    
    /// 最终伤害
    pub final_damage: u32,
    
    /// 是否暴击
    pub is_critical: bool,
}

impl GcDamageResult {
    /// 创建新的伤害结果
    pub fn new(raw: u32, reduced: u32, final_dmg: u32) -> Self {
        Self {
            raw_damage: raw,
            reduced_damage: reduced,
            final_damage: final_dmg,
            is_critical: false,
        }
    }
}

// =============================================================================
// 游戏操作
// =============================================================================

/// 游戏操作类型
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GcAction {
    /// 出牌
    #[serde(rename = "play_card")]
    PlayCard {
        player_id: GcPlayerId,
        card_id: GcCardId,
        target_id: GcPlayerId,
    },
    
    /// 结束回合
    #[serde(rename = "end_turn")]
    EndTurn {
        player_id: GcPlayerId,
    },
    
    /// 投降
    #[serde(rename = "surrender")]
    Surrender {
        player_id: GcPlayerId,
    },
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gc_config() {
        assert_eq!(GcConfig::MAX_HAND_SIZE, 10);
        assert_eq!(GcConfig::DEFAULT_HP, 100);
    }

    #[test]
    fn test_gc_damage_result() {
        let result = GcDamageResult::new(100, 30, 70);
        assert_eq!(result.raw_damage, 100);
        assert_eq!(result.reduced_damage, 30);
        assert_eq!(result.final_damage, 70);
        assert!(!result.is_critical);
    }
}

