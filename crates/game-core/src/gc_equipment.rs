//! 装备系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现装备机制：
//! - 装备部位 (武器、头盔、护甲、鞋子、饰品)
//! - 装备稀有度
//! - 装备属性加成
//! - 职业限制

use serde::{Deserialize, Serialize};
use crate::{GcBaseStats, GcCombatStats, GcProfessionType};

// =============================================================================
// 装备枚举
// =============================================================================

/// 装备部位
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum GcEquipmentSlot {
    /// 武器 - 增加攻击力
    Weapon,
    /// 头盔 - 增加生命和防御
    Helmet,
    /// 护甲 - 增加大量防御
    Armor,
    /// 鞋子 - 增加敏捷和闪避
    Boots,
    /// 饰品 - 增加特殊属性
    Accessory,
}

impl GcEquipmentSlot {
    pub fn gc_name(&self) -> &'static str {
        match self {
            GcEquipmentSlot::Weapon => "武器",
            GcEquipmentSlot::Helmet => "头盔",
            GcEquipmentSlot::Armor => "护甲",
            GcEquipmentSlot::Boots => "鞋子",
            GcEquipmentSlot::Accessory => "饰品",
        }
    }
}

/// 装备稀有度
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum GcRarity {
    /// 普通 (白)
    Common,
    /// 优秀 (绿)
    Uncommon,
    /// 稀有 (蓝)
    Rare,
    /// 史诗 (紫)
    Epic,
    /// 传说 (橙)
    Legendary,
}

impl GcRarity {
    pub fn gc_name(&self) -> &'static str {
        match self {
            GcRarity::Common => "普通",
            GcRarity::Uncommon => "优秀",
            GcRarity::Rare => "稀有",
            GcRarity::Epic => "史诗",
            GcRarity::Legendary => "传说",
        }
    }

    pub fn gc_color(&self) -> &'static str {
        match self {
            GcRarity::Common => "#ffffff",    // White
            GcRarity::Uncommon => "#22c55e",  // Green
            GcRarity::Rare => "#3b82f6",      // Blue
            GcRarity::Epic => "#a855f7",      // Purple
            GcRarity::Legendary => "#f59e0b", // Orange
        }
    }
    
    /// 获取属性倍率
    pub fn gc_multiplier(&self) -> f32 {
        match self {
            GcRarity::Common => 1.0,
            GcRarity::Uncommon => 1.2,
            GcRarity::Rare => 1.5,
            GcRarity::Epic => 2.0,
            GcRarity::Legendary => 3.0,
        }
    }
}

// =============================================================================
// 装备结构
// =============================================================================

/// 装备物品
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEquipment {
    /// 唯一 ID (实例 ID)
    pub id: String,
    /// 模板 ID
    pub template_id: String,
    /// 名称
    pub name: String,
    /// 描述
    pub description: String,
    /// 部位
    pub slot: GcEquipmentSlot,
    /// 稀有度
    pub rarity: GcRarity,
    /// 需求等级
    pub required_level: u32,
    /// 职业限制 (None 表示通用，Some 表示允许的职业列表)
    pub required_professions: Option<Vec<GcProfessionType>>,
    /// 基础属性加成
    pub base_stats: GcBaseStats,
    /// 战斗属性加成
    pub combat_stats: GcCombatStats,
    /// 售价
    pub price: u32,
    /// 图标
    pub icon: String,
}

impl GcEquipment {
    /// 创建新装备
    pub fn gc_new(
        id: &str,
        template_id: &str,
        name: &str,
        slot: GcEquipmentSlot,
        rarity: GcRarity,
    ) -> Self {
        Self {
            id: id.to_string(),
            template_id: template_id.to_string(),
            name: name.to_string(),
            description: String::new(),
            slot,
            rarity,
            required_level: 1,
            required_professions: None,
            base_stats: GcBaseStats::default(),
            combat_stats: GcCombatStats::default(),
            price: 10,
            icon: match slot {
                GcEquipmentSlot::Weapon => "⚔️".to_string(),
                GcEquipmentSlot::Helmet => "🪖".to_string(),
                GcEquipmentSlot::Armor => "👕".to_string(),
                GcEquipmentSlot::Boots => "👢".to_string(),
                GcEquipmentSlot::Accessory => "💍".to_string(),
            },
        }
    }

    /// 设置描述
    pub fn gc_with_description(mut self, desc: &str) -> Self {
        self.description = desc.to_string();
        self
    }

    /// 设置等级需求
    pub fn gc_with_level(mut self, level: u32) -> Self {
        self.required_level = level;
        self
    }

    /// 设置职业限制 (单个)
    pub fn gc_with_profession(mut self, profession: GcProfessionType) -> Self {
        self.required_professions = Some(vec![profession]);
        self
    }

    /// 设置职业限制 (多个)
    pub fn gc_with_professions(mut self, professions: Vec<GcProfessionType>) -> Self {
        self.required_professions = Some(professions);
        self
    }

    /// 设置基础属性
    pub fn gc_with_base_stats(mut self, stats: GcBaseStats) -> Self {
        self.base_stats = stats;
        self
    }

    /// 设置战斗属性
    pub fn gc_with_combat_stats(mut self, stats: GcCombatStats) -> Self {
        self.combat_stats = stats;
        self
    }
    
    /// 检查是否可装备
    pub fn gc_can_equip(&self, level: u32, profession: GcProfessionType) -> Result<(), String> {
        if level < self.required_level {
            return Err(format!("等级不足 (需要 Lv.{})", self.required_level));
        }
        
        if let Some(req_profs) = &self.required_professions {
            if !req_profs.contains(&profession) {
                let names: Vec<&str> = req_profs.iter().map(|p| p.gc_name()).collect();
                return Err(format!("职业不符 (需要 {})", names.join(" 或 ")));
            }
        }
        
        Ok(())
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcStatType;

    #[test]
    fn test_gc_equipment_creation() {
        let sword = GcEquipment::gc_new(
            "sword_1",
            "tpl_sword_1",
            "新手铁剑",
            GcEquipmentSlot::Weapon,
            GcRarity::Common,
        );
        
        assert_eq!(sword.name, "新手铁剑");
        assert_eq!(sword.slot, GcEquipmentSlot::Weapon);
        assert_eq!(sword.rarity, GcRarity::Common);
    }

    #[test]
    fn test_gc_equipment_requirements() {
        let mut sword = GcEquipment::gc_new(
            "sword_1",
            "tpl_sword_1",
            "骑士长剑",
            GcEquipmentSlot::Weapon,
            GcRarity::Rare,
        );
        
        sword = sword.gc_with_level(10)
                     .gc_with_profession(GcProfessionType::Knight);
        
        // 满足条件
        assert!(sword.gc_can_equip(10, GcProfessionType::Knight).is_ok());
        assert!(sword.gc_can_equip(15, GcProfessionType::Knight).is_ok());
        
        // 等级不足
        assert!(sword.gc_can_equip(5, GcProfessionType::Knight).is_err());
        
        // 职业不符
        assert!(sword.gc_can_equip(10, GcProfessionType::Warlock).is_err());
    }
    
    #[test]
    fn test_gc_rarity_multiplier() {
        assert_eq!(GcRarity::Common.gc_multiplier(), 1.0);
        assert_eq!(GcRarity::Legendary.gc_multiplier(), 3.0);
    }
}
