//! 装备模板数据
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 提供预定义的装备模板，用于生成游戏中的物品。

use crate::{
    GcEquipment, GcEquipmentSlot, GcRarity, GcStatType, GcProfessionType
};

/// 装备模板生成器
pub struct GcEquipmentTemplates;

impl GcEquipmentTemplates {
    // =========================================================================
    // 武器 (Weapons)
    // =========================================================================

    /// 新手木剑
    pub fn wooden_sword() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "", // ID 由调用者生成
            "tpl_w_wooden_sword",
            "新手木剑",
            GcEquipmentSlot::Weapon,
            GcRarity::Common,
        );
        item.description = "一把简单的木剑，适合新手练习。".to_string();
        item.base_stats.strength = 2;
        item.combat_stats.physical_attack = 5;
        item.required_level = 1;
        item
    }

    /// 铁剑
    pub fn iron_sword() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "",
            "tpl_w_iron_sword",
            "铁剑",
            GcEquipmentSlot::Weapon,
            GcRarity::Uncommon,
        );
        item.description = "标准的士兵用剑，锋利耐用。".to_string();
        item.base_stats.strength = 5;
        item.combat_stats.physical_attack = 12;
        item.required_level = 5;
        item.required_professions = Some(vec![GcProfessionType::Swordsman]);
        item
    }

    /// 法师学徒法杖
    pub fn apprentice_staff() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "",
            "tpl_w_apprentice_staff",
            "学徒法杖",
            GcEquipmentSlot::Weapon,
            GcRarity::Common,
        );
        item.description = "刻有基础符文的木杖。".to_string();
        item.base_stats.intelligence = 3;
        item.combat_stats.magic_attack = 6;
        item.required_level = 1;
        item.required_professions = Some(vec![GcProfessionType::Warlock, GcProfessionType::Knight]);
        item
    }

    // =========================================================================
    // 防具 (Armor)
    // =========================================================================

    /// 布衣
    pub fn cloth_armor() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "",
            "tpl_a_cloth_armor",
            "粗布衣",
            GcEquipmentSlot::Armor,
            GcRarity::Common,
        );
        item.description = "普通的布衣，防御力很低。".to_string();
        item.base_stats.vitality = 2;
        item.combat_stats.physical_defense = 3;
        item.required_level = 1;
        item
    }

    /// 皮甲
    pub fn leather_armor() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "",
            "tpl_a_leather_armor",
            "硬皮甲",
            GcEquipmentSlot::Armor,
            GcRarity::Uncommon,
        );
        item.description = "经过硬化处理的皮甲，轻便且有一定防御力。".to_string();
        item.base_stats.vitality = 4;
        item.base_stats.agility = 2;
        item.combat_stats.physical_defense = 8;
        item.required_level = 5;
        item
    }

    /// 铁甲
    pub fn iron_armor() -> GcEquipment {
        let mut item = GcEquipment::gc_new(
            "",
            "tpl_a_iron_armor",
            "铁制胸甲",
            GcEquipmentSlot::Armor,
            GcRarity::Rare,
        );
        item.description = "厚重的铁甲，提供优秀的物理防御。".to_string();
        item.base_stats.vitality = 8;
        item.base_stats.strength = 2;
        item.combat_stats.physical_defense = 15;
        item.required_level = 10;
        item.required_professions = Some(vec![GcProfessionType::Swordsman]);
        item
    }
}
