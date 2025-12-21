//! 核心类型定义
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};

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
