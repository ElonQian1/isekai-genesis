//! 职业天赋预设
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 提供各职业的预设天赋树

use crate::{
    GcTalentTree, GcTalentNode, GcTalentNodeType, GcTalentEffect, 
    GcProfessionType, GcStatType
};

// =============================================================================
// 骑士天赋树 (Knight)
// =============================================================================

/// 创建骑士天赋树
pub fn gc_create_knight_talent_tree() -> GcTalentTree {
    let mut tree = GcTalentTree::gc_new(
        "tree_knight_guardian", 
        "守护者", 
        Some(GcProfessionType::Knight)
    )
    .gc_with_description("专注于防御和保护队友的天赋路线");
    
    // 1. 体质强化
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "knight_t1_vit",
            "体质强化",
            "增加基础体质属性",
            GcTalentNodeType::Minor,
            5,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Vitality, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Vitality, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Vitality, value: 6 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Vitality, value: 8 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Vitality, value: 10 }],
        ])
        .gc_with_icon("")
    );

    // 2. 坚韧 (被动)
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "knight_t2_toughness",
            "坚韧",
            "受到伤害减少",
            GcTalentNodeType::Major,
            3,
            (0, 1),
        )
        .gc_with_prerequisites(vec!["knight_t1_vit"])
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddCombatStatPercent { stat_name: "damage_reduction".to_string(), percent: 3 }],
            vec![GcTalentEffect::AddCombatStatPercent { stat_name: "damage_reduction".to_string(), percent: 6 }],
            vec![GcTalentEffect::AddCombatStatPercent { stat_name: "damage_reduction".to_string(), percent: 10 }],
        ])
        .gc_with_icon("")
    );

    tree
}

// =============================================================================
// 剑士天赋树 (Swordsman)
// =============================================================================

/// 创建剑士天赋树
pub fn gc_create_swordsman_talent_tree() -> GcTalentTree {
    let mut tree = GcTalentTree::gc_new(
        "tree_swordsman_berserker", 
        "狂战士", 
        Some(GcProfessionType::Swordsman)
    )
    .gc_with_description("牺牲防御换取极致输出的天赋路线");
    
    // 1. 力量强化
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "swordsman_t1_str",
            "力量强化",
            "增加基础力量属性",
            GcTalentNodeType::Minor,
            5,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 6 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 8 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Strength, value: 10 }],
        ])
        .gc_with_icon("")
    );

    tree
}

// =============================================================================
// 术士天赋树 (Warlock)
// =============================================================================

/// 创建术士天赋树
pub fn gc_create_warlock_talent_tree() -> GcTalentTree {
    let mut tree = GcTalentTree::gc_new(
        "tree_warlock_destruction", 
        "毁灭", 
        Some(GcProfessionType::Warlock)
    )
    .gc_with_description("专注于毁灭性魔法的天赋路线");
    
    // 1. 智力强化
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "warlock_t1_int",
            "智力强化",
            "增加基础智力属性",
            GcTalentNodeType::Minor,
            5,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Intelligence, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Intelligence, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Intelligence, value: 6 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Intelligence, value: 8 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Intelligence, value: 10 }],
        ])
        .gc_with_icon("")
    );

    tree
}

// =============================================================================
// 枪手天赋树 (Gunner)
// =============================================================================

/// 创建枪手天赋树
pub fn gc_create_gunner_talent_tree() -> GcTalentTree {
    let mut tree = GcTalentTree::gc_new(
        "tree_gunner_marksman", 
        "神射手", 
        Some(GcProfessionType::Gunner)
    )
    .gc_with_description("专注于远程精准打击的天赋路线");
    
    // 1. 敏捷强化
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "gunner_t1_agi",
            "敏捷强化",
            "增加基础敏捷属性",
            GcTalentNodeType::Minor,
            5,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 6 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 8 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 10 }],
        ])
        .gc_with_icon("")
    );

    tree
}

// =============================================================================
// 刺客天赋树 (Assassin)
// =============================================================================

/// 创建刺客天赋树
pub fn gc_create_assassin_talent_tree() -> GcTalentTree {
    let mut tree = GcTalentTree::gc_new(
        "tree_assassin_shadow", 
        "暗影", 
        Some(GcProfessionType::Assassin)
    )
    .gc_with_description("专注于潜行和爆发的天赋路线");
    
    // 1. 敏捷强化
    tree.gc_add_node(
        GcTalentNode::gc_new(
            "assassin_t1_agi",
            "敏捷强化",
            "增加基础敏捷属性",
            GcTalentNodeType::Minor,
            5,
            (0, 0),
        )
        .gc_with_effects(vec![
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 2 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 4 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 6 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 8 }],
            vec![GcTalentEffect::AddBaseStat { stat_type: GcStatType::Agility, value: 10 }],
        ])
        .gc_with_icon("")
    );

    tree
}

