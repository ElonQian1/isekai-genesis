//! 召唤规则系统
//!
//! 普通召唤: 每回合1次, ≤4星直接召唤
//! 祭品召唤: 5-6星需1祭品, ≥7星需2祭品
//! 特殊召唤: 卡牌效果触发, 仅己方回合

use serde::{Deserialize, Serialize};

/// 召唤类型
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcSummonType {
    /// 普通召唤 (每回合限1次)
    Normal,
    /// 祭品召唤 (需要场上怪兽作祭品)
    Tribute { sacrifice_slots: Vec<u8> },
    /// 特殊召唤 (卡牌效果)
    Special,
}

/// 召唤错误
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcSummonError {
    /// 本回合已普通召唤
    NormalSummonUsed,
    /// 祭品不足
    InsufficientTributes { required: u8, provided: u8 },
    /// 无效的祭品槽位
    InvalidTributeSlot(u8),
    /// 目标槽位已被占用
    SlotOccupied(u8),
    /// 怪兽等级过高无法普通召唤
    LevelTooHigh(u8),
    /// 不是己方回合
    NotYourTurn,
}

/// 计算需要的祭品数量
pub fn gc_required_tributes(level: u8) -> u8 {
    match level {
        0..=4 => 0,
        5..=6 => 1,
        _ => 2,
    }
}

/// 验证普通召唤
pub fn gc_validate_normal_summon(
    level: u8,
    normal_summon_used: bool,
) -> Result<(), GcSummonError> {
    if normal_summon_used {
        return Err(GcSummonError::NormalSummonUsed);
    }
    if level > 4 {
        return Err(GcSummonError::LevelTooHigh(level));
    }
    Ok(())
}

/// 验证祭品召唤
pub fn gc_validate_tribute_summon(
    level: u8,
    sacrifice_slots: &[u8],
    occupied_slots: &[bool; 5],
) -> Result<(), GcSummonError> {
    let required = gc_required_tributes(level);
    
    if sacrifice_slots.len() < required as usize {
        return Err(GcSummonError::InsufficientTributes {
            required,
            provided: sacrifice_slots.len() as u8,
        });
    }

    for &slot in sacrifice_slots {
        if slot >= 5 || !occupied_slots[slot as usize] {
            return Err(GcSummonError::InvalidTributeSlot(slot));
        }
    }

    Ok(())
}

// =============================================================================
// 特殊召唤
// =============================================================================

/// 特殊召唤来源
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum GcSpecialSummonSource {
    /// 卡牌效果
    CardEffect { card_id: String },
    /// 怪兽效果
    MonsterEffect { monster_id: String },
    /// 墓地召唤
    Graveyard,
}

/// 验证特殊召唤
/// 
/// 特殊召唤规则:
/// - 只能在己方回合主阶段进行
/// - 不占用普通召唤次数
/// - 目标槽位必须为空
pub fn gc_validate_special_summon(
    is_main_phase: bool,
    target_slot: u8,
    occupied_slots: &[bool; 5],
) -> Result<(), GcSummonError> {
    // 只能在主阶段
    if !is_main_phase {
        return Err(GcSummonError::NotYourTurn);
    }
    
    // 目标槽位必须为空
    if target_slot >= 5 {
        return Err(GcSummonError::InvalidTributeSlot(target_slot));
    }
    if occupied_slots[target_slot as usize] {
        return Err(GcSummonError::SlotOccupied(target_slot));
    }
    
    Ok(())
}
