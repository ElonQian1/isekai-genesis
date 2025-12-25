//! 职业系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现职业逻辑：
//! - 5 大基础职业
//! - 职业属性加成
//! - 职业特性

use serde::{Deserialize, Serialize};

// =============================================================================
// 职业枚举
// =============================================================================

/// 职业类型
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GcProfessionType {
    /// 骑士 - 坦克/守护
    Knight,
    /// 剑士 - 近战输出
    Swordsman,
    /// 术士 - 魔法输出
    Warlock,
    /// 枪手 - 远程输出
    Gunner,
    /// 刺客 - 爆发输出
    Assassin,
}

impl GcProfessionType {
    /// 获取所有职业
    pub fn gc_all() -> Vec<GcProfessionType> {
        vec![
            GcProfessionType::Knight,
            GcProfessionType::Swordsman,
            GcProfessionType::Warlock,
            GcProfessionType::Gunner,
            GcProfessionType::Assassin,
        ]
    }
    
    /// 获取职业名称
    pub fn gc_name(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "骑士",
            GcProfessionType::Swordsman => "剑士",
            GcProfessionType::Warlock => "术士",
            GcProfessionType::Gunner => "枪手",
            GcProfessionType::Assassin => "刺客",
        }
    }

    pub fn gc_id(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "knight",
            GcProfessionType::Swordsman => "swordsman",
            GcProfessionType::Warlock => "warlock",
            GcProfessionType::Gunner => "gunner",
            GcProfessionType::Assassin => "assassin",
        }
    }

    pub fn gc_description(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "高防御，擅长保护队友",
            GcProfessionType::Swordsman => "平衡的攻防能力",
            GcProfessionType::Warlock => "强大的魔法伤害和控制",
            GcProfessionType::Gunner => "远程物理输出",
            GcProfessionType::Assassin => "高爆发，脆弱",
        }
    }

    pub fn gc_primary_stat(&self) -> crate::GcStatType {
        use crate::GcStatType;
        match self {
            GcProfessionType::Knight => GcStatType::Vitality,
            GcProfessionType::Swordsman => GcStatType::Strength,
            GcProfessionType::Warlock => GcStatType::Intelligence,
            GcProfessionType::Gunner => GcStatType::Agility,
            GcProfessionType::Assassin => GcStatType::Agility,
        }
    }

    /// 获取职业图标
    pub fn gc_icon(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "",
            GcProfessionType::Swordsman => "",
            GcProfessionType::Warlock => "",
            GcProfessionType::Gunner => "",
            GcProfessionType::Assassin => "",
        }
    }

    /// 获取职业定位
    pub fn gc_role(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "坦克/守护",
            GcProfessionType::Swordsman => "近战输出",
            GcProfessionType::Warlock => "魔法输出",
            GcProfessionType::Gunner => "远程输出",
            GcProfessionType::Assassin => "爆发输出",
        }
    }

    /// 获取职业专属天赋名称
    pub fn gc_talent_name(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "钢铁意志",
            GcProfessionType::Swordsman => "剑意纵横",
            GcProfessionType::Warlock => "暗影契约",
            GcProfessionType::Gunner => "精准校准",
            GcProfessionType::Assassin => "暗影步",
        }
    }

    /// 获取职业专属天赋描述
    pub fn gc_talent_desc(&self) -> &'static str {
        match self {
            GcProfessionType::Knight => "生命<30%时减伤50%，持续3回合",
            GcProfessionType::Swordsman => "连续攻击同一目标，每次伤害+15%，最多3层",
            GcProfessionType::Warlock => "施放魔法卡后下一次魔法伤害+25%，并回复10魔力",
            GcProfessionType::Gunner => "30%概率触发精准，造成150%伤害并无视30%护甲",
            GcProfessionType::Assassin => "首次攻击必定暴击，且暴击伤害+50%",
        }
    }
    
    /// 获取初始卡牌模板ID列表 (普通攻击, 小技能, 大招)
    pub fn gc_starter_deck(&self) -> Vec<&'static str> {
        match self {
            GcProfessionType::Knight => vec!["card_strike", "card_defend", "card_shield_bash"],
            GcProfessionType::Swordsman => vec!["card_strike", "card_slash", "card_blade_dance"],
            GcProfessionType::Warlock => vec!["card_magic_missile", "card_fireball", "card_shadow_bolt"],
            GcProfessionType::Gunner => vec!["card_shoot", "card_aim", "card_rapid_fire"],
            GcProfessionType::Assassin => vec!["card_stab", "card_poison", "card_assassinate"],
        }
    }
}

// =============================================================================
// 职业结构
// =============================================================================

/// 职业详细信息
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcProfession {
    pub profession_type: GcProfessionType,
    pub name: String,
    pub description: String,
    pub icon: String,
}

impl GcProfession {
    pub fn gc_new(prof_type: GcProfessionType) -> Self {
        Self {
            profession_type: prof_type,
            name: prof_type.gc_name().to_string(),
            description: prof_type.gc_role().to_string(),
            icon: prof_type.gc_icon().to_string(),
        }
    }

    /// 计算职业基础属性
    pub fn gc_calculate_stats(&self, level: u32) -> crate::GcBaseStats {
        let mut stats = crate::GcBaseStats::default();
        // 简单实现：每级增加属性
        match self.profession_type {
            GcProfessionType::Knight => {
                stats.vitality = 10 + level * 3;
                stats.strength = 5 + level * 2;
                stats.agility = 3 + level;
                stats.intelligence = 2 + level;
            },
            GcProfessionType::Swordsman => {
                stats.vitality = 8 + level * 2;
                stats.strength = 8 + level * 3;
                stats.agility = 5 + level * 2;
                stats.intelligence = 2 + level;
            },
            GcProfessionType::Warlock => {
                stats.vitality = 5 + level;
                stats.strength = 2 + level;
                stats.agility = 3 + level;
                stats.intelligence = 10 + level * 3;
            },
            GcProfessionType::Gunner => {
                stats.vitality = 6 + level;
                stats.strength = 4 + level * 2;
                stats.agility = 8 + level * 3;
                stats.intelligence = 4 + level;
            },
            GcProfessionType::Assassin => {
                stats.vitality = 5 + level;
                stats.strength = 6 + level * 2;
                stats.agility = 10 + level * 3;
                stats.intelligence = 3 + level;
            },
        }
        stats
    }
}

