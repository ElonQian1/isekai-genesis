//! 卡牌模板系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 定义所有卡牌的模板数据

use crate::{GcCard, GcCardType, GcCardRarity, GcTargetType, GcEffect, GcEffectType};

/// 获取卡牌模板
pub fn gc_get_card_template(template_id: &str) -> Option<GcCard> {
    match template_id {
        // =============================================================================
        // 骑士 (Knight)
        // =============================================================================
        "card_knight_attack" => Some(GcCard {
            id: "temp_id".to_string(), // 实际使用时会被替换
            template_id: template_id.to_string(),
            name: "盾击".to_string(),
            description: "造成 8 点物理伤害，获得 5 点格挡".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost: 1,
            base_damage: 8,
            base_defense: 5,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::GainBlock,
                    value: 5,
                    duration: 0,
                    target: GcTargetType::SelfTarget,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_knight_skill" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "嘲讽怒吼".to_string(),
            description: "嘲讽所有敌人，获得 15 点格挡".to_string(),
            card_type: GcCardType::Skill,
            rarity: GcCardRarity::Rare,
            cost: 2,
            base_damage: 0,
            base_defense: 15,
            target_type: GcTargetType::AllEnemies,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::Taunt,
                    value: 1,
                    duration: 1,
                    target: GcTargetType::AllEnemies,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::GainBlock,
                    value: 15,
                    duration: 0,
                    target: GcTargetType::SelfTarget,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_knight_ult" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "圣光守护".to_string(),
            description: "获得 30 点格挡，所有队友获得 15 点格挡".to_string(),
            card_type: GcCardType::Skill, // 大招也是技能牌
            rarity: GcCardRarity::Legendary,
            cost: 3,
            base_damage: 0,
            base_defense: 30,
            target_type: GcTargetType::AllAllies,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::GainBlock,
                    value: 30,
                    duration: 0,
                    target: GcTargetType::SelfTarget,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::GainBlock,
                    value: 15,
                    duration: 0,
                    target: GcTargetType::AllAllies,
                    name: "Effect".to_string(),
                },
            ],
        }),

        // =============================================================================
        // 剑士 (Swordsman)
        // =============================================================================
        "card_swordsman_attack" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "斩击".to_string(),
            description: "造成 12 点物理伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost: 1,
            base_damage: 12,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 12,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_swordsman_skill" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "旋风斩".to_string(),
            description: "对所有敌人造成 8 点物理伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Rare,
            cost: 2,
            base_damage: 8,
            base_defense: 0,
            target_type: GcTargetType::AllEnemies,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::AllEnemies,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_swordsman_ult" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "破空斩".to_string(),
            description: "造成 30 点物理伤害，无视防御".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Legendary,
            cost: 3,
            base_damage: 30,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 30,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),

        // =============================================================================
        // 术士 (Warlock)
        // =============================================================================
        "card_warlock_attack" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "暗影箭".to_string(),
            description: "造成 10 点魔法伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost: 1,
            base_damage: 10,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::MagicDamage,
                    value: 10,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_warlock_skill" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "腐蚀术".to_string(),
            description: "造成 5 点伤害，施加 3 层中毒".to_string(),
            card_type: GcCardType::Skill,
            rarity: GcCardRarity::Rare,
            cost: 1,
            base_damage: 5,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::MagicDamage,
                    value: 5,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::ApplyPoison,
                    value: 3,
                    duration: 3,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_warlock_ult" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "混乱之雨".to_string(),
            description: "对所有敌人造成 20 点魔法伤害，施加 2 层虚弱".to_string(),
            card_type: GcCardType::Skill,
            rarity: GcCardRarity::Legendary,
            cost: 3,
            base_damage: 20,
            base_defense: 0,
            target_type: GcTargetType::AllEnemies,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::MagicDamage,
                    value: 20,
                    duration: 0,
                    target: GcTargetType::AllEnemies,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::ApplyWeak,
                    value: 2,
                    duration: 2,
                    target: GcTargetType::AllEnemies,
                    name: "Effect".to_string(),
                },
            ],
        }),

        // =============================================================================
        // 枪手 (Gunner)
        // =============================================================================
        "card_gunner_attack" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "射击".to_string(),
            description: "造成 10 点物理伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost: 1,
            base_damage: 10,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 10,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_gunner_skill" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "快速射击".to_string(),
            description: "造成 3 次 5 点物理伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Rare,
            cost: 2,
            base_damage: 5,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 5,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 5,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 5,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_gunner_ult" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "爆头".to_string(),
            description: "造成 40 点物理伤害，必定暴击".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Legendary,
            cost: 3,
            base_damage: 40,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 40,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),

        // =============================================================================
        // 刺客 (Assassin)
        // =============================================================================
        "card_assassin_attack" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "刺击".to_string(),
            description: "造成 12 点物理伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost: 1,
            base_damage: 12,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 12,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_assassin_skill" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "毒刃".to_string(),
            description: "造成 8 点伤害，施加 5 层中毒".to_string(),
            card_type: GcCardType::Skill,
            rarity: GcCardRarity::Rare,
            cost: 1,
            base_damage: 8,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::ApplyPoison,
                    value: 5,
                    duration: 5,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),
        "card_assassin_ult" => Some(GcCard {
            id: "temp_id".to_string(),
            template_id: template_id.to_string(),
            name: "瞬狱影杀阵".to_string(),
            description: "对随机敌人造成 5 次 8 点伤害".to_string(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Legendary,
            cost: 3,
            base_damage: 8,
            base_defense: 0,
            target_type: GcTargetType::AllEnemies, // 实际上是随机目标，这里简化
            effects: vec![
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
                GcEffect {
                    effect_type: GcEffectType::PhysicalDamage,
                    value: 8,
                    duration: 0,
                    target: GcTargetType::SingleEnemy,
                    name: "Effect".to_string(),
                },
            ],
        }),

        _ => None,
    }
}

