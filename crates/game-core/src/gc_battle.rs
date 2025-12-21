//! 战斗系统
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{
    GcBattleId, GcPlayerId, GcCardId, GcPlayer, GcCard, GcConfig,
    GcDamageResult, GcEffectResult, GcError,
};

// =============================================================================
// 战斗阶段
// =============================================================================

/// 战斗阶段
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GcBattlePhase {
    /// 战斗开始
    Starting,
    /// 抽牌阶段
    DrawCard,
    /// 行动阶段
    Playing,
    /// 回合结束
    EndTurn,
    /// 战斗结束
    Finished,
}

impl Default for GcBattlePhase {
    fn default() -> Self {
        Self::Starting
    }
}

// =============================================================================
// 出牌结果
// =============================================================================

/// 出牌操作结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayCardResult {
    /// 是否成功
    pub success: bool,
    
    /// 错误信息 (失败时)
    pub error: Option<String>,
    
    /// 使用的卡牌
    pub card_used: Option<GcCard>,
    
    /// 造成的伤害
    pub damage_dealt: u32,
    
    /// 触发的效果
    pub effects_triggered: Vec<GcEffectResult>,
    
    /// 目标是否死亡
    pub target_killed: bool,
}

impl GcPlayCardResult {
    /// 创建成功结果
    pub fn success(card: GcCard, damage: u32, effects: Vec<GcEffectResult>, killed: bool) -> Self {
        Self {
            success: true,
            error: None,
            card_used: Some(card),
            damage_dealt: damage,
            effects_triggered: effects,
            target_killed: killed,
        }
    }
    
    /// 创建失败结果
    pub fn fail(error: impl Into<String>) -> Self {
        Self {
            success: false,
            error: Some(error.into()),
            card_used: None,
            damage_dealt: 0,
            effects_triggered: Vec::new(),
            target_killed: false,
        }
    }
}

// =============================================================================
// 战斗状态
// =============================================================================

/// 战斗状态 (完整快照)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattleState {
    /// 战斗 ID
    pub id: GcBattleId,
    
    /// 当前回合数
    pub turn: u32,
    
    /// 当前行动玩家索引
    pub current_player_index: usize,
    
    /// 所有玩家
    pub players: Vec<GcPlayer>,
    
    /// 战斗阶段
    pub phase: GcBattlePhase,
    
    /// 回合时间限制 (秒)
    pub turn_time_limit: u32,
    
    /// 胜利者 ID (战斗结束时)
    pub winner_id: Option<GcPlayerId>,
}

impl GcBattleState {
    /// 创建新战斗
    pub fn gc_new(id: impl Into<String>, players: Vec<GcPlayer>) -> Self {
        Self {
            id: id.into(),
            turn: 1,
            current_player_index: 0,
            players,
            phase: GcBattlePhase::Starting,
            turn_time_limit: GcConfig::TURN_TIME_LIMIT,
            winner_id: None,
        }
    }
    
    /// 获取当前行动玩家
    pub fn gc_current_player(&self) -> Option<&GcPlayer> {
        self.players.get(self.current_player_index)
    }
    
    /// 获取当前行动玩家 (可变)
    pub fn gc_current_player_mut(&mut self) -> Option<&mut GcPlayer> {
        self.players.get_mut(self.current_player_index)
    }
    
    /// 获取当前玩家 ID
    pub fn gc_current_player_id(&self) -> Option<&str> {
        self.gc_current_player().map(|p| p.id.as_str())
    }
    
    /// 根据 ID 查找玩家
    pub fn gc_find_player(&self, player_id: &str) -> Option<&GcPlayer> {
        self.players.iter().find(|p| p.id == player_id)
    }
    
    /// 根据 ID 查找玩家 (可变)
    pub fn gc_find_player_mut(&mut self, player_id: &str) -> Option<&mut GcPlayer> {
        self.players.iter_mut().find(|p| p.id == player_id)
    }
    
    /// 战斗是否结束
    pub fn gc_is_finished(&self) -> bool {
        self.phase == GcBattlePhase::Finished
    }
    
    /// 检查战斗是否应该结束
    pub fn gc_check_battle_end(&mut self) {
        let alive_players: Vec<_> = self.players
            .iter()
            .filter(|p| p.gc_can_act())
            .collect();
        
        if alive_players.len() <= 1 {
            self.phase = GcBattlePhase::Finished;
            self.winner_id = alive_players.first().map(|p| p.id.clone());
        }
    }
    
    /// 进入下一回合
    pub fn gc_next_turn(&mut self) {
        // 寻找下一个可行动的玩家
        let player_count = self.players.len();
        for i in 1..=player_count {
            let next_index = (self.current_player_index + i) % player_count;
            if self.players[next_index].gc_can_act() {
                self.current_player_index = next_index;
                
                // 如果回到第一个玩家，增加回合数
                if next_index <= self.current_player_index {
                    self.turn += 1;
                }
                
                self.phase = GcBattlePhase::DrawCard;
                return;
            }
        }
        
        // 没有可行动的玩家，战斗结束
        self.gc_check_battle_end();
    }
}

// =============================================================================
// 核心战斗函数
// =============================================================================

/// 验证出牌操作
pub fn gc_validate_play_card(
    state: &GcBattleState,
    player_id: &str,
    card_id: &str,
    target_id: &str,
) -> Result<(), GcError> {
    // 1. 检查战斗是否结束
    if state.gc_is_finished() {
        return Err(GcError::GcBattleEnded);
    }
    
    // 2. 检查是否轮到该玩家
    if state.gc_current_player_id() != Some(player_id) {
        return Err(GcError::GcNotYourTurn);
    }
    
    // 3. 检查玩家是否存在
    let player = state.gc_find_player(player_id)
        .ok_or(GcError::GcPlayerNotFound)?;
    
    // 4. 检查卡牌是否在手中
    let card = player.gc_find_card_in_hand(card_id)
        .ok_or(GcError::GcCardNotInHand)?;
    
    // 5. 检查能量是否足够
    if player.stats.energy < card.cost {
        return Err(GcError::GcNotEnoughEnergy);
    }
    
    // 6. 检查目标是否有效
    if card.gc_needs_target() {
        let target = state.gc_find_player(target_id)
            .ok_or(GcError::GcInvalidTarget)?;
        
        if !target.gc_can_act() {
            return Err(GcError::GcInvalidTarget);
        }
    }
    
    Ok(())
}

/// 计算伤害
pub fn gc_calculate_damage(
    attacker: &GcPlayer,
    target: &GcPlayer,
    card: &GcCard,
) -> GcDamageResult {
    let base_damage = card.base_damage + attacker.stats.attack;
    let defense_reduction = (target.stats.defense as f32 * 0.3) as u32;
    let final_damage = base_damage.saturating_sub(defense_reduction);
    
    GcDamageResult::new(base_damage, defense_reduction, final_damage)
}

/// 执行出牌操作
pub fn gc_execute_play_card(
    state: &mut GcBattleState,
    player_id: &str,
    card_id: &str,
    target_id: &str,
) -> GcPlayCardResult {
    // 先验证
    if let Err(e) = gc_validate_play_card(state, player_id, card_id, target_id) {
        return GcPlayCardResult::fail(e.to_string());
    }
    
    // 获取卡牌 (克隆，因为后面要移除)
    let card = state.gc_find_player(player_id)
        .and_then(|p| p.gc_find_card_in_hand(card_id))
        .cloned()
        .unwrap();
    
    // 计算伤害
    let damage_result = {
        let attacker = state.gc_find_player(player_id).unwrap();
        let target = state.gc_find_player(target_id).unwrap();
        gc_calculate_damage(attacker, target, &card)
    };
    
    // 应用伤害
    let target_killed = {
        let target = state.gc_find_player_mut(target_id).unwrap();
        target.stats.gc_take_damage(damage_result.final_damage);
        !target.stats.gc_is_alive()
    };
    
    if target_killed {
        let target = state.gc_find_player_mut(target_id).unwrap();
        target.state = crate::GcPlayerState::Dead;
    }
    
    // 消耗能量并移除卡牌
    {
        let player = state.gc_find_player_mut(player_id).unwrap();
        player.stats.energy = player.stats.energy.saturating_sub(card.cost);
        if let Some(used_card) = player.gc_remove_card_from_hand(card_id) {
            player.discard.push(used_card);
        }
    }
    
    // 检查战斗是否结束
    state.gc_check_battle_end();
    
    // 构造效果结果
    let effects = vec![
        GcEffectResult::new(
            "伤害",
            target_id,
            damage_result.final_damage as i32,
            format!("造成 {} 点伤害", damage_result.final_damage),
        ),
    ];
    
    GcPlayCardResult::success(card, damage_result.final_damage, effects, target_killed)
}

// =============================================================================
// 测试
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_battle() -> GcBattleState {
        let mut p1 = GcPlayer::gc_new("p1", "玩家1");
        let mut p2 = GcPlayer::gc_new("p2", "玩家2");
        
        // 给玩家1一张攻击卡
        let card = GcCard::gc_new_attack("c1", "重击", 1, 20);
        p1.hand.push(card);
        
        GcBattleState::gc_new("battle1", vec![p1, p2])
    }

    #[test]
    fn test_gc_battle_state_new() {
        let battle = create_test_battle();
        assert_eq!(battle.turn, 1);
        assert_eq!(battle.current_player_index, 0);
        assert_eq!(battle.players.len(), 2);
    }

    #[test]
    fn test_gc_validate_play_card() {
        let battle = create_test_battle();
        
        // 正确的出牌
        let result = gc_validate_play_card(&battle, "p1", "c1", "p2");
        assert!(result.is_ok());
        
        // 不是自己的回合
        let result = gc_validate_play_card(&battle, "p2", "c1", "p1");
        assert!(matches!(result, Err(GcError::GcNotYourTurn)));
    }

    #[test]
    fn test_gc_execute_play_card() {
        let mut battle = create_test_battle();
        
        let result = gc_execute_play_card(&mut battle, "p1", "c1", "p2");
        assert!(result.success);
        assert!(result.damage_dealt > 0);
        
        // 检查目标受到伤害
        let target = battle.gc_find_player("p2").unwrap();
        assert!(target.stats.hp < GcConfig::DEFAULT_HP);
    }
}
