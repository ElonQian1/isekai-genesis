//! 战场部署系统
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/01-game-core.md
//!
//! 实现 5 槽位战场部署机制：
//! - 玩家将手牌部署到战场
//! - 战场上的卡牌可以攻击敌方
//! - 每个槽位只能放一张卡牌

use serde::{Deserialize, Serialize};
use crate::GcCard;

// =============================================================================
// 战场配置
// =============================================================================

/// 战场配置
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattlefieldConfig {
    /// 槽位数量
    pub slot_count: usize,
    
    /// 部署卡牌消耗的行动力
    pub deploy_cost: u32,
}

impl Default for GcBattlefieldConfig {
    fn default() -> Self {
        Self {
            slot_count: 5,
            deploy_cost: 1,
        }
    }
}

// =============================================================================
// 战斗结果
// =============================================================================

/// 单次攻击结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcAttackResult {
    /// 攻击者槽位
    pub attacker_slot: usize,
    /// 攻击者卡牌名称
    pub attacker_name: String,
    /// 目标槽位
    pub target_slot: usize,
    /// 目标卡牌名称 (如果有)
    pub target_name: Option<String>,
    /// 造成的伤害
    pub damage: u32,
    /// 目标是否被摧毁
    pub target_destroyed: bool,
    /// 是否直接攻击玩家
    pub hit_player: bool,
}

/// 战场战斗回合结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattlefieldCombatResult {
    /// 所有攻击结果
    pub attacks: Vec<GcAttackResult>,
    /// 对玩家造成的总伤害
    pub player_damage: u32,
    /// 摧毁的敌方卡牌数
    pub cards_destroyed: u32,
}

// =============================================================================
// 战场槽位
// =============================================================================

/// 战场槽位状态
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattlefieldSlot {
    /// 槽位索引 (0-4)
    pub index: usize,
    
    /// 部署的卡牌 (如果有)
    pub card: Option<GcCard>,
    
    /// 是否可以攻击 (刚部署的卡牌不能攻击)
    pub can_attack: bool,
    
    /// 剩余生命值 (防御卡牌的护盾值)
    pub remaining_hp: u32,
}

impl GcBattlefieldSlot {
    /// 创建空槽位
    pub fn gc_new(index: usize) -> Self {
        Self {
            index,
            card: None,
            can_attack: false,
            remaining_hp: 0,
        }
    }
    
    /// 是否为空
    pub fn gc_is_empty(&self) -> bool {
        self.card.is_none()
    }
    
    /// 部署卡牌
    pub fn gc_deploy(&mut self, card: GcCard) {
        // 计算初始生命值 (攻击卡用伤害值，防御卡用护盾值)
        self.remaining_hp = match card.card_type {
            crate::GcCardType::Defense => card.base_defense,
            _ => card.base_damage.max(1), // 至少 1 点 HP
        };
        self.card = Some(card);
        self.can_attack = false; // 刚部署不能攻击
    }
    
    /// 移除卡牌
    pub fn gc_remove(&mut self) -> Option<GcCard> {
        let card = self.card.take();
        self.can_attack = false;
        self.remaining_hp = 0;
        card
    }
    
    /// 启用攻击 (回合开始时)
    pub fn gc_enable_attack(&mut self) {
        if self.card.is_some() {
            self.can_attack = true;
        }
    }
    
    /// 受到伤害
    pub fn gc_take_damage(&mut self, damage: u32) -> bool {
        if self.remaining_hp <= damage {
            self.remaining_hp = 0;
            self.gc_remove();
            true // 卡牌被摧毁
        } else {
            self.remaining_hp -= damage;
            false
        }
    }
}

// =============================================================================
// 战场
// =============================================================================

/// 玩家战场
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattlefield {
    /// 配置
    pub config: GcBattlefieldConfig,
    
    /// 所有槽位
    pub slots: Vec<GcBattlefieldSlot>,
}

impl GcBattlefield {
    /// 创建新战场
    pub fn gc_new(config: GcBattlefieldConfig) -> Self {
        let slots = (0..config.slot_count)
            .map(GcBattlefieldSlot::gc_new)
            .collect();
        
        Self { config, slots }
    }
    
    /// 使用默认配置创建
    pub fn gc_default() -> Self {
        Self::gc_new(GcBattlefieldConfig::default())
    }
    
    /// 获取指定槽位
    pub fn gc_get_slot(&self, index: usize) -> Option<&GcBattlefieldSlot> {
        self.slots.get(index)
    }
    
    /// 获取指定槽位 (可变)
    pub fn gc_get_slot_mut(&mut self, index: usize) -> Option<&mut GcBattlefieldSlot> {
        self.slots.get_mut(index)
    }
    
    /// 部署卡牌到指定槽位
    pub fn gc_deploy_to_slot(&mut self, slot_index: usize, card: GcCard) -> Result<(), String> {
        let slot = self.slots.get_mut(slot_index)
            .ok_or_else(|| "无效的槽位".to_string())?;
        
        if !slot.gc_is_empty() {
            return Err("槽位已被占用".to_string());
        }
        
        slot.gc_deploy(card);
        Ok(())
    }
    
    /// 从槽位移除卡牌
    pub fn gc_remove_from_slot(&mut self, slot_index: usize) -> Option<GcCard> {
        self.slots.get_mut(slot_index)
            .and_then(|slot| slot.gc_remove())
    }
    
    /// 获取空闲槽位
    pub fn gc_get_empty_slots(&self) -> Vec<usize> {
        self.slots.iter()
            .enumerate()
            .filter(|(_, slot)| slot.gc_is_empty())
            .map(|(i, _)| i)
            .collect()
    }
    
    /// 获取已占用槽位
    pub fn gc_get_occupied_slots(&self) -> Vec<usize> {
        self.slots.iter()
            .enumerate()
            .filter(|(_, slot)| !slot.gc_is_empty())
            .map(|(i, _)| i)
            .collect()
    }
    
    /// 获取可攻击的槽位
    pub fn gc_get_attackable_slots(&self) -> Vec<usize> {
        self.slots.iter()
            .enumerate()
            .filter(|(_, slot)| slot.can_attack && slot.card.is_some())
            .map(|(i, _)| i)
            .collect()
    }
    
    /// 回合开始：启用所有已部署卡牌的攻击
    pub fn gc_on_turn_start(&mut self) {
        for slot in &mut self.slots {
            slot.gc_enable_attack();
        }
    }
    
    /// 计算战场总攻击力
    pub fn gc_total_attack(&self) -> u32 {
        self.slots.iter()
            .filter_map(|slot| {
                slot.card.as_ref().map(|c| c.base_damage)
            })
            .sum()
    }
    
    /// 计算战场总防御力
    pub fn gc_total_defense(&self) -> u32 {
        self.slots.iter()
            .map(|slot| slot.remaining_hp)
            .sum()
    }
    
    /// 是否已满
    pub fn gc_is_full(&self) -> bool {
        self.slots.iter().all(|slot| !slot.gc_is_empty())
    }
    
    /// 已部署卡牌数量
    pub fn gc_deployed_count(&self) -> usize {
        self.slots.iter().filter(|slot| !slot.gc_is_empty()).count()
    }
    
    /// 执行战场攻击 (攻击敌方战场)
    /// 返回战斗结果和对玩家的直接伤害
    pub fn gc_attack_battlefield(&mut self, enemy_battlefield: &mut GcBattlefield) -> GcBattlefieldCombatResult {
        let mut result = GcBattlefieldCombatResult {
            attacks: Vec::new(),
            player_damage: 0,
            cards_destroyed: 0,
        };
        
        // 遍历所有可攻击的槽位
        for i in 0..self.slots.len() {
            let slot = &self.slots[i];
            
            // 跳过空槽位和不能攻击的卡牌
            if !slot.can_attack || slot.card.is_none() {
                continue;
            }
            
            let attacker_card = slot.card.as_ref().unwrap();
            let damage = attacker_card.base_damage;
            let attacker_name = attacker_card.name.clone();
            
            // 寻找对位敌方槽位
            let target_slot_index = i;
            let enemy_slot = enemy_battlefield.gc_get_slot_mut(target_slot_index);
            
            if let Some(enemy_slot) = enemy_slot {
                if !enemy_slot.gc_is_empty() {
                    // 攻击敌方卡牌
                    let target_name = enemy_slot.card.as_ref().map(|c| c.name.clone());
                    let destroyed = enemy_slot.gc_take_damage(damage);
                    
                    if destroyed {
                        result.cards_destroyed += 1;
                    }
                    
                    result.attacks.push(GcAttackResult {
                        attacker_slot: i,
                        attacker_name,
                        target_slot: target_slot_index,
                        target_name,
                        damage,
                        target_destroyed: destroyed,
                        hit_player: false,
                    });
                } else {
                    // 对位无敌方卡牌，直接攻击玩家
                    result.player_damage += damage;
                    result.attacks.push(GcAttackResult {
                        attacker_slot: i,
                        attacker_name,
                        target_slot: target_slot_index,
                        target_name: None,
                        damage,
                        target_destroyed: false,
                        hit_player: true,
                    });
                }
            }
        }
        
        // 攻击后，重置攻击状态 (每回合只能攻击一次)
        for slot in &mut self.slots {
            slot.can_attack = false;
        }
        
        result
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::GcCard;

    #[test]
    fn test_gc_battlefield_new() {
        let bf = GcBattlefield::gc_default();
        assert_eq!(bf.slots.len(), 5);
        assert!(bf.gc_get_empty_slots().len() == 5);
    }

    #[test]
    fn test_gc_deploy_card() {
        let mut bf = GcBattlefield::gc_default();
        let card = GcCard::gc_new_attack("card1", "打击", 1, 10);
        
        assert!(bf.gc_deploy_to_slot(0, card).is_ok());
        assert!(!bf.slots[0].gc_is_empty());
        assert_eq!(bf.gc_get_empty_slots().len(), 4);
    }

    #[test]
    fn test_gc_slot_cannot_double_deploy() {
        let mut bf = GcBattlefield::gc_default();
        let card1 = GcCard::gc_new_attack("card1", "打击", 1, 10);
        let card2 = GcCard::gc_new_attack("card2", "重击", 1, 15);
        
        assert!(bf.gc_deploy_to_slot(0, card1).is_ok());
        assert!(bf.gc_deploy_to_slot(0, card2).is_err());
    }

    #[test]
    fn test_gc_attack_after_turn() {
        let mut bf = GcBattlefield::gc_default();
        let card = GcCard::gc_new_attack("card1", "打击", 1, 10);
        
        bf.gc_deploy_to_slot(0, card).unwrap();
        assert!(!bf.slots[0].can_attack); // 刚部署不能攻击
        
        bf.gc_on_turn_start();
        assert!(bf.slots[0].can_attack); // 下一回合可以攻击
    }

    #[test]
    fn test_gc_slot_take_damage() {
        let mut bf = GcBattlefield::gc_default();
        let card = GcCard::gc_new_attack("card1", "打击", 1, 10);
        
        bf.gc_deploy_to_slot(0, card).unwrap();
        assert_eq!(bf.slots[0].remaining_hp, 10);
        
        let destroyed = bf.slots[0].gc_take_damage(5);
        assert!(!destroyed);
        assert_eq!(bf.slots[0].remaining_hp, 5);
        
        let destroyed = bf.slots[0].gc_take_damage(10);
        assert!(destroyed);
        assert!(bf.slots[0].gc_is_empty());
    }
}
