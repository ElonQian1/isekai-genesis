//! 卡牌相关类型和逻辑
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{GcCardId, GcCardTemplateId, GcEffect};

// =============================================================================
// 卡牌类型
// =============================================================================

/// 卡牌类型
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcCardType {
    /// 攻击牌
    Attack,
    /// 防御牌
    Defense,
    /// 技能牌
    Skill,
    /// 特殊牌
    Special,
}

impl Default for GcCardType {
    fn default() -> Self {
        Self::Attack
    }
}

// =============================================================================
// 卡牌稀有度
// =============================================================================

/// 卡牌稀有度
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcCardRarity {
    /// 普通
    Common,
    /// 稀有
    Rare,
    /// 史诗
    Epic,
    /// 传说
    Legendary,
}

impl Default for GcCardRarity {
    fn default() -> Self {
        Self::Common
    }
}

// =============================================================================
// 卡牌目标类型
// =============================================================================

/// 卡牌目标类型
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcTargetType {
    /// 单个敌人
    SingleEnemy,
    /// 所有敌人
    AllEnemies,
    /// 自己
    #[serde(rename = "self")]
    SelfTarget,
    /// 单个友方
    SingleAlly,
    /// 所有友方
    AllAllies,
    /// 无需目标
    None,
}

impl Default for GcTargetType {
    fn default() -> Self {
        Self::SingleEnemy
    }
}

// =============================================================================
// 卡牌
// =============================================================================

/// 卡牌实例
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCard {
    /// 实例唯一 ID
    pub id: GcCardId,
    
    /// 模板 ID
    pub template_id: GcCardTemplateId,
    
    /// 卡牌名称
    pub name: String,
    
    /// 描述
    pub description: String,
    
    /// 卡牌类型
    pub card_type: GcCardType,
    
    /// 稀有度
    pub rarity: GcCardRarity,
    
    /// 费用
    pub cost: u32,
    
    /// 基础伤害
    pub base_damage: u32,
    
    /// 基础防御
    pub base_defense: u32,
    
    /// 目标类型
    pub target_type: GcTargetType,
    
    /// 效果列表
    pub effects: Vec<GcEffect>,
}

impl GcCard {
    /// 创建攻击卡牌
    pub fn gc_new_attack(
        id: impl Into<String>,
        name: impl Into<String>,
        cost: u32,
        damage: u32,
    ) -> Self {
        Self {
            id: id.into(),
            template_id: String::new(),
            name: name.into(),
            description: String::new(),
            card_type: GcCardType::Attack,
            rarity: GcCardRarity::Common,
            cost,
            base_damage: damage,
            base_defense: 0,
            target_type: GcTargetType::SingleEnemy,
            effects: Vec::new(),
        }
    }
    
    /// 创建防御卡牌
    pub fn gc_new_defense(
        id: impl Into<String>,
        name: impl Into<String>,
        cost: u32,
        defense: u32,
    ) -> Self {
        Self {
            id: id.into(),
            template_id: String::new(),
            name: name.into(),
            description: String::new(),
            card_type: GcCardType::Defense,
            rarity: GcCardRarity::Common,
            cost,
            base_damage: 0,
            base_defense: defense,
            target_type: GcTargetType::SelfTarget,
            effects: Vec::new(),
        }
    }
    
    /// 是否需要选择目标
    pub fn gc_needs_target(&self) -> bool {
        matches!(
            self.target_type,
            GcTargetType::SingleEnemy | GcTargetType::SingleAlly
        )
    }
}

// =============================================================================
// 卡牌模板 (用于定义卡牌库)
// =============================================================================

/// 卡牌模板
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCardTemplate {
    /// 模板 ID
    pub id: GcCardTemplateId,
    
    /// 卡牌名称
    pub name: String,
    
    /// 描述
    pub description: String,
    
    /// 卡牌类型
    pub card_type: GcCardType,
    
    /// 稀有度
    pub rarity: GcCardRarity,
    
    /// 费用
    pub cost: u32,
    
    /// 基础伤害
    pub base_damage: u32,
    
    /// 基础防御
    pub base_defense: u32,
    
    /// 目标类型
    pub target_type: GcTargetType,
    
    /// 效果列表
    pub effects: Vec<GcEffect>,
}

impl GcCardTemplate {
    /// 从模板创建卡牌实例
    pub fn gc_create_instance(&self, instance_id: impl Into<String>) -> GcCard {
        GcCard {
            id: instance_id.into(),
            template_id: self.id.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            card_type: self.card_type.clone(),
            rarity: self.rarity.clone(),
            cost: self.cost,
            base_damage: self.base_damage,
            base_defense: self.base_defense,
            target_type: self.target_type.clone(),
            effects: self.effects.clone(),
        }
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gc_card_attack() {
        let card = GcCard::gc_new_attack("c1", "重击", 2, 15);
        assert_eq!(card.id, "c1");
        assert_eq!(card.name, "重击");
        assert_eq!(card.cost, 2);
        assert_eq!(card.base_damage, 15);
        assert_eq!(card.card_type, GcCardType::Attack);
        assert!(card.gc_needs_target());
    }

    #[test]
    fn test_gc_card_defense() {
        let card = GcCard::gc_new_defense("c2", "格挡", 1, 10);
        assert_eq!(card.card_type, GcCardType::Defense);
        assert_eq!(card.base_defense, 10);
        assert!(!card.gc_needs_target());
    }
}
