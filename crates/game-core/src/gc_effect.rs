//! 效果系统
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{GcPlayerId, GcTargetType};

// =============================================================================
// 效果类型
// =============================================================================

/// 效果类型
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcEffectType {
    /// 造成伤害 (通用)
    Damage,
    /// 物理伤害
    PhysicalDamage,
    /// 魔法伤害
    MagicDamage,
    /// 治疗
    Heal,
    /// 获得护甲/防御
    Armor,
    /// 获得格挡 (同 Armor)
    GainBlock,
    /// 抽牌
    DrawCard,
    /// 弃牌
    DiscardCard,
    /// 增益 Buff
    Buff,
    /// 减益 Debuff
    Debuff,
    /// 眩晕
    Stun,
    /// 中毒
    Poison,
    /// 施加中毒 (同 Poison)
    ApplyPoison,
    /// 虚弱
    Weak,
    /// 施加虚弱 (同 Weak)
    ApplyWeak,
    /// 嘲讽
    Taunt,
}

// =============================================================================
// 效果
// =============================================================================

/// 效果定义
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEffect {
    /// 效果类型
    pub effect_type: GcEffectType,
    
    /// 效果数值
    pub value: i32,
    
    /// 持续回合数 (0 = 立即生效)
    pub duration: u32,
    
    /// 效果名称 (用于显示)
    pub name: String,

    /// 效果目标 (覆盖卡牌目标)
    pub target: GcTargetType,
}

impl GcEffect {
    /// 创建伤害效果
    pub fn gc_damage(value: i32) -> Self {
        Self {
            effect_type: GcEffectType::Damage,
            value,
            duration: 0,
            name: "伤害".to_string(),
            target: GcTargetType::SingleEnemy,
        }
    }
    
    /// 创建治疗效果
    pub fn gc_heal(value: i32) -> Self {
        Self {
            effect_type: GcEffectType::Heal,
            value,
            duration: 0,
            name: "治疗".to_string(),
            target: GcTargetType::SelfTarget,
        }
    }
    
    /// 创建护甲效果
    pub fn gc_armor(value: i32) -> Self {
        Self {
            effect_type: GcEffectType::Armor,
            value,
            duration: 0,
            name: "护甲".to_string(),
            target: GcTargetType::SelfTarget,
        }
    }
    
    /// 创建抽牌效果
    pub fn gc_draw(count: i32) -> Self {
        Self {
            effect_type: GcEffectType::DrawCard,
            value: count,
            duration: 0,
            name: "抽牌".to_string(),
            target: GcTargetType::SelfTarget,
        }
    }
    
    /// 创建中毒效果
    pub fn gc_poison(damage: i32, duration: u32) -> Self {
        Self {
            effect_type: GcEffectType::Poison,
            value: damage,
            duration,
            name: "中毒".to_string(),
            target: GcTargetType::SingleEnemy,
        }
    }
    
    /// 创建眩晕效果
    pub fn gc_stun(duration: u32) -> Self {
        Self {
            effect_type: GcEffectType::Stun,
            value: 0,
            duration,
            name: "眩晕".to_string(),
            target: GcTargetType::SingleEnemy,
        }
    }
}

// =============================================================================
// 效果执行结果
// =============================================================================

/// 效果执行结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEffectResult {
    /// 效果名称
    pub effect_name: String,
    
    /// 目标 ID
    pub target_id: GcPlayerId,
    
    /// 实际生效数值
    pub actual_value: i32,
    
    /// 描述信息
    pub message: String,
}

impl GcEffectResult {
    pub fn new(
        effect_name: impl Into<String>,
        target_id: impl Into<String>,
        actual_value: i32,
        message: impl Into<String>,
    ) -> Self {
        Self {
            effect_name: effect_name.into(),
            target_id: target_id.into(),
            actual_value,
            message: message.into(),
        }
    }
}

// =============================================================================
// 玩家身上的持续效果
// =============================================================================

/// 持续效果 (Buff/Debuff)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcActiveEffect {
    /// 效果定义
    pub effect: GcEffect,
    
    /// 剩余回合数
    pub remaining_turns: u32,
    
    /// 来源玩家 ID
    pub source_id: GcPlayerId,
}

impl GcActiveEffect {
    /// 创建新的持续效果
    pub fn new(effect: GcEffect, source_id: impl Into<String>) -> Self {
        let remaining = effect.duration;
        Self {
            effect,
            remaining_turns: remaining,
            source_id: source_id.into(),
        }
    }
    
    /// 回合结束时减少持续时间
    pub fn gc_tick(&mut self) -> bool {
        if self.remaining_turns > 0 {
            self.remaining_turns -= 1;
        }
        self.remaining_turns == 0
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gc_effect_damage() {
        let effect = GcEffect::gc_damage(20);
        assert_eq!(effect.effect_type, GcEffectType::Damage);
        assert_eq!(effect.value, 20);
        assert_eq!(effect.duration, 0);
    }

    #[test]
    fn test_gc_effect_poison() {
        let effect = GcEffect::gc_poison(5, 3);
        assert_eq!(effect.effect_type, GcEffectType::Poison);
        assert_eq!(effect.value, 5);
        assert_eq!(effect.duration, 3);
    }

    #[test]
    fn test_gc_active_effect_tick() {
        let effect = GcEffect::gc_poison(5, 3);
        let mut active = GcActiveEffect::new(effect, "p1");
        
        assert_eq!(active.remaining_turns, 3);
        assert!(!active.gc_tick()); // 还剩 2
        assert!(!active.gc_tick()); // 还剩 1
        assert!(active.gc_tick());  // 结束
    }
}
