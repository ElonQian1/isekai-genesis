//! 玩家相关类型和逻辑
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{GcCard, GcPlayerId, GcConfig};

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
    
    /// 能量/法力值
    pub energy: u32,
    
    /// 最大能量
    pub max_energy: u32,
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
}
