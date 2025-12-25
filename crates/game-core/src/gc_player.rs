//! 玩家相关类型和逻辑
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{
    GcCard, GcPlayerId, GcConfig, GcBattlefield,
    GcProfessionType, GcPlayerTalents, GcInventory,
    GcBaseStats, GcCombatStats, GcProfession,
};

// =============================================================================
// 玩家状态
// =============================================================================

/// 玩家状态
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcPlayerState {
    /// 存活
    Alive,
    /// 死亡
    Dead,
    /// 眩晕
    Stunned,
    /// 断线
    Disconnected,
}

impl Default for GcPlayerState {
    fn default() -> Self {
        Self::Alive
    }
}

// =============================================================================
// 玩家属性
// =============================================================================

/// 玩家战斗属性
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayerStats {
    /// 当前生命值
    pub hp: u32,
    
    /// 最大生命值
    pub max_hp: u32,
    
    /// 攻击力
    pub attack: u32,
    
    /// 防御力
    pub defense: u32,
    
    /// 能量/法力值 (出牌消耗)
    pub energy: u32,
    
    /// 最大能量
    pub max_energy: u32,
    
    /// 行动力 (获取卡牌消耗)
    pub action_points: u32,
    
    /// 最大行动力
    pub max_action_points: u32,
}

impl Default for GcPlayerStats {
    fn default() -> Self {
        Self {
            hp: GcConfig::DEFAULT_HP,
            max_hp: GcConfig::DEFAULT_HP,
            attack: GcConfig::DEFAULT_ATTACK,
            defense: GcConfig::DEFAULT_DEFENSE,
            energy: 3,
            max_energy: 10,
            action_points: 5,
            max_action_points: 5,
        }
    }
}

impl GcPlayerStats {
    /// 受到伤害
    pub fn gc_take_damage(&mut self, damage: u32) -> u32 {
        let actual = damage.min(self.hp);
        self.hp = self.hp.saturating_sub(damage);
        actual
    }
    
    /// 恢复生命
    pub fn gc_heal(&mut self, amount: u32) -> u32 {
        let actual = amount.min(self.max_hp - self.hp);
        self.hp = (self.hp + amount).min(self.max_hp);
        actual
    }
    
    /// 是否存活
    pub fn gc_is_alive(&self) -> bool {
        self.hp > 0
    }
    
    /// 消耗行动力
    pub fn gc_use_action_points(&mut self, cost: u32) -> bool {
        if self.action_points >= cost {
            self.action_points -= cost;
            true
        } else {
            false
        }
    }
    
    /// 是否有足够行动力
    pub fn gc_has_action_points(&self, cost: u32) -> bool {
        self.action_points >= cost
    }
    
    /// 重置行动力 (回合开始时)
    pub fn gc_reset_action_points(&mut self) {
        self.action_points = self.max_action_points;
    }
}

// =============================================================================
// 玩家
// =============================================================================

/// 玩家数据
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayer {
    /// 唯一 ID
    pub id: GcPlayerId,
    
    /// 显示名称
    pub name: String,
    
    /// 战斗属性
    pub stats: GcPlayerStats,
    
    /// 状态
    pub state: GcPlayerState,
    
    /// 手牌
    pub hand: Vec<GcCard>,
    
    /// 牌库
    pub deck: Vec<GcCard>,
    
    /// 弃牌堆
    pub discard: Vec<GcCard>,
    
    /// 战场 (5槽位)
    pub battlefield: GcBattlefield,

    // --- RPG 属性 ---
    
    /// 等级
    pub level: u32,
    
    /// 职业
    pub profession: Option<GcProfessionType>,
    
    /// 天赋
    pub talents: Option<GcPlayerTalents>,
    
    /// 背包与装备
    pub inventory: Option<GcInventory>,
}

impl GcPlayer {
    /// 创建新玩家
    pub fn gc_new(id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            stats: GcPlayerStats::default(),
            state: GcPlayerState::Alive,
            hand: Vec::new(),
            deck: Vec::new(),
            discard: Vec::new(),
            battlefield: GcBattlefield::gc_default(),
            level: 1,
            profession: None,
            talents: None,
            inventory: None,
        }
    }

    /// 初始化 RPG 系统 (职业、背包)
    pub fn gc_init_rpg(&mut self, profession: GcProfessionType) {
        self.profession = Some(profession);
        self.inventory = Some(GcInventory::gc_new(&self.id, 20));
        // 天赋系统初始化比较复杂，通常单独调用
        self.gc_update_rpg_stats();
    }

    /// 更新 RPG 属性 (根据等级、职业、装备、天赋计算战斗属性)
    pub fn gc_update_rpg_stats(&mut self) {
        // 1. 获取职业基础属性
        let mut base_stats = if let Some(prof_type) = self.profession {
            let profession = GcProfession::gc_new(prof_type);
            profession.gc_calculate_stats(self.level)
        } else {
            GcBaseStats::default()
        };
        
        // 2. 加上装备基础属性
        if let Some(inv) = &self.inventory {
            let (equip_base, _) = inv.gc_get_total_stats();
            base_stats.gc_merge(&equip_base);
        }
        
        // 3. 计算战斗属性 (基础 -> 战斗)
        let mut combat_stats = GcCombatStats::gc_from_base_stats(&base_stats, self.level);
        
        // 4. 加上装备战斗属性
        if let Some(inv) = &self.inventory {
            let (_, equip_combat) = inv.gc_get_total_stats();
            combat_stats.gc_merge(&equip_combat);
        }
        
        // 5. 应用到玩家战斗属性 (Battle Stats)
        self.stats.max_hp = combat_stats.max_hp as u32;
        self.stats.attack = combat_stats.physical_attack.max(combat_stats.magic_attack) as u32;
        self.stats.defense = combat_stats.physical_defense.max(combat_stats.magic_defense) as u32;
        
        // 保持当前生命值不超过最大值
        if self.stats.hp > self.stats.max_hp {
            self.stats.hp = self.stats.max_hp;
        }
        // 如果当前生命值为默认值(100)，且最大生命值增加了，则回满
        // 这里简单处理：如果满血，则保持满血
        if self.stats.hp == GcConfig::DEFAULT_HP && self.stats.max_hp > GcConfig::DEFAULT_HP {
             self.stats.hp = self.stats.max_hp;
        }
    }
    
    /// 是否可以行动
    pub fn gc_can_act(&self) -> bool {
        self.state == GcPlayerState::Alive && self.stats.gc_is_alive()
    }
    
    /// 手牌是否已满
    pub fn gc_is_hand_full(&self) -> bool {
        self.hand.len() >= GcConfig::MAX_HAND_SIZE
    }
    
    /// 从手牌中移除卡牌
    pub fn gc_remove_card_from_hand(&mut self, card_id: &str) -> Option<GcCard> {
        if let Some(index) = self.hand.iter().position(|c| c.id == card_id) {
            Some(self.hand.remove(index))
        } else {
            None
        }
    }
    
    /// 查找手牌中的卡牌
    pub fn gc_find_card_in_hand(&self, card_id: &str) -> Option<&GcCard> {
        self.hand.iter().find(|c| c.id == card_id)
    }
    
    /// 抽牌 (从牌库到手牌)
    /// 返回实际抽到的牌数
    pub fn gc_draw_cards(&mut self, count: usize) -> usize {
        let mut drawn = 0;
        for _ in 0..count {
            if self.gc_is_hand_full() {
                break;
            }
            if let Some(card) = self.deck.pop() {
                self.hand.push(card);
                drawn += 1;
            } else {
                // 牌库空了，洗入弃牌堆
                if self.discard.is_empty() {
                    break;
                }
                self.deck.append(&mut self.discard);
                // 注意：实际洗牌需要外部提供随机数
                if let Some(card) = self.deck.pop() {
                    self.hand.push(card);
                    drawn += 1;
                }
            }
        }
        drawn
    }
    
    // =========================================================================
    // 战场相关
    // =========================================================================
    
    /// 从手牌部署卡牌到战场
    pub fn gc_deploy_to_battlefield(&mut self, card_id: &str, slot_index: usize) -> Result<(), String> {
        // 从手牌移除卡牌
        let card = self.gc_remove_card_from_hand(card_id)
            .ok_or_else(|| "卡牌不在手牌中".to_string())?;
        
        // 部署到战场
        if let Err(e) = self.battlefield.gc_deploy_to_slot(slot_index, card.clone()) {
            // 部署失败，卡牌放回手牌
            self.hand.push(card);
            return Err(e);
        }
        
        Ok(())
    }
    
    /// 获取战场空闲槽位
    pub fn gc_get_empty_battlefield_slots(&self) -> Vec<usize> {
        self.battlefield.gc_get_empty_slots()
    }
    
    /// 战场是否已满
    pub fn gc_is_battlefield_full(&self) -> bool {
        self.battlefield.gc_is_full()
    }
    
    /// 回合开始：启用战场攻击
    pub fn gc_on_turn_start(&mut self) {
        self.battlefield.gc_on_turn_start();
    }
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gc_player_new() {
        let player = GcPlayer::gc_new("p1", "测试玩家");
        assert_eq!(player.id, "p1");
        assert_eq!(player.name, "测试玩家");
        assert_eq!(player.stats.hp, GcConfig::DEFAULT_HP);
        assert!(player.gc_can_act());
    }

    #[test]
    fn test_gc_player_stats_damage() {
        let mut stats = GcPlayerStats::default();
        let damage = stats.gc_take_damage(30);
        assert_eq!(damage, 30);
        assert_eq!(stats.hp, 70);
        assert!(stats.gc_is_alive());
    }

    #[test]
    fn test_gc_player_stats_heal() {
        let mut stats = GcPlayerStats::default();
        stats.hp = 50;
        let healed = stats.gc_heal(30);
        assert_eq!(healed, 30);
        assert_eq!(stats.hp, 80);
        
        // 测试过量治疗
        let healed2 = stats.gc_heal(50);
        assert_eq!(healed2, 20);
        assert_eq!(stats.hp, 100);
    }

    #[test]
    fn test_gc_player_rpg_stats() {
        use crate::{GcEquipmentTemplates, GcEquipmentSlot};
        
        let mut player = GcPlayer::gc_new("p1", "RPG Player");
        player.gc_init_rpg(GcProfessionType::Warrior);
        
        // 初始状态 (Warrior Lv.1)
        // Warrior Base: STR 15, VIT 15
        // Combat: HP = 100 + 15*10 + 1*20 = 270
        // Attack = 15*2 + 1*3 = 33
        // Defense = 15 + 15/2 = 22
        assert_eq!(player.stats.max_hp, 270);
        assert_eq!(player.stats.attack, 33);
        assert_eq!(player.stats.defense, 22);
        
        // 升级到 Lv.5
        player.level = 5;
        player.gc_update_rpg_stats();
        
        // Warrior Lv.5 (Growth: STR 3, VIT 3 per level)
        // Base: STR 15 + 4*3 = 27, VIT 15 + 4*3 = 27
        // HP = 100 + 27*10 + 5*20 = 470
        // Attack = 27*2 + 5*3 = 69
        assert_eq!(player.stats.max_hp, 470);
        assert_eq!(player.stats.attack, 69);
        
        // 装备铁剑 (Req Lv.5)
        // Iron Sword: STR +5, ATK +12
        let mut sword = GcEquipmentTemplates::iron_sword();
        // 生成 ID
        sword.id = "sword_1".to_string();
        
        player.inventory.as_mut().unwrap().gc_add_item(sword.clone()).unwrap();
        player.inventory.as_mut().unwrap().gc_equip_item(&sword.id, 5, GcProfessionType::Warrior).unwrap();
        
        // 更新属性
        player.gc_update_rpg_stats();
        
        // New Stats:
        // Base STR: 27 + 5 = 32
        // Combat Attack (from Base): 32*2 + 5*3 = 79
        // Combat Attack (from Equip): 12
        // Total Attack: 79 + 12 = 91
        assert_eq!(player.stats.attack, 91);
    }
}
