//! 战斗系统
//!
//! 模块: game-core (共享核心)
//! 前缀: Gc
//! 文档: 文档/01-game-core.md

use serde::{Deserialize, Serialize};
use crate::{
    GcBattleId, GcPlayerId, GcPlayer, GcCard, GcConfig,
    GcDamageResult, GcEffectResult, GcError,
    GcCardPool, GcCardPoolConfig,
    GcBattlefieldCombatResult,
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
// 回合结束结果
// =============================================================================

/// 回合结束战斗结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEndTurnResult {
    /// 玩家战场攻击结果
    pub player_combat: GcBattlefieldCombatResult,
    /// 对手战场攻击结果
    pub opponent_combat: GcBattlefieldCombatResult,
    /// 玩家受到的总伤害
    pub player_damage_taken: u32,
    /// 对手受到的总伤害
    pub opponent_damage_taken: u32,
    /// 战斗是否结束
    pub battle_ended: bool,
    /// 获胜者 ID (如果战斗结束)
    pub winner_id: Option<String>,
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
    
    /// 公共卡池
    pub card_pool: GcCardPool,
    
    /// 每回合行动力上限
    pub action_points_per_turn: u32,
}

impl GcBattleState {
    /// 创建新战斗
    pub fn gc_new(id: impl Into<String>, players: Vec<GcPlayer>) -> Self {
        let mut card_pool = GcCardPool::gc_default();
        card_pool.gc_initialize();
        
        Self {
            id: id.into(),
            turn: 1,
            current_player_index: 0,
            players,
            phase: GcBattlePhase::Starting,
            turn_time_limit: GcConfig::TURN_TIME_LIMIT,
            winner_id: None,
            card_pool,
            action_points_per_turn: 5,
        }
    }
    
    /// 创建带自定义配置的战斗
    pub fn gc_new_with_config(
        id: impl Into<String>,
        players: Vec<GcPlayer>,
        pool_config: GcCardPoolConfig,
        action_points: u32,
    ) -> Self {
        let mut card_pool = GcCardPool::gc_new(pool_config);
        card_pool.gc_initialize();
        
        Self {
            id: id.into(),
            turn: 1,
            current_player_index: 0,
            players,
            phase: GcBattlePhase::Starting,
            turn_time_limit: GcConfig::TURN_TIME_LIMIT,
            winner_id: None,
            card_pool,
            action_points_per_turn: action_points,
        }
    }
    
    /// 获取公共卡池展示区
    pub fn gc_get_pool_display(&self) -> &[GcCard] {
        self.card_pool.gc_get_display()
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
                // 重置当前玩家的行动力
                self.players[next_index].stats.gc_reset_action_points();
                
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
    
    /// 从公共卡池获取卡牌 (消耗行动力)
    pub fn gc_acquire_card_from_pool(
        &mut self,
        player_id: &str,
        card_id: &str,
    ) -> Result<GcCard, GcError> {
        // 检查是否轮到该玩家
        if self.gc_current_player_id() != Some(player_id) {
            return Err(GcError::GcNotYourTurn);
        }
        
        // 检查玩家
        let player = self.gc_find_player(player_id)
            .ok_or(GcError::GcPlayerNotFound)?;
        
        // 检查行动力
        let cost = self.card_pool.config.acquire_cost;
        if !player.stats.gc_has_action_points(cost) {
            return Err(GcError::GcNotEnoughActionPoints);
        }
        
        // 检查手牌是否已满
        if player.gc_is_hand_full() {
            return Err(GcError::GcHandFull);
        }
        
        // 获取卡牌
        let card = self.card_pool.gc_acquire_card(card_id)
            .ok_or(GcError::GcCardNotInPool)?;
        
        // 消耗行动力并添加到手牌
        let player = self.gc_find_player_mut(player_id).unwrap();
        player.stats.gc_use_action_points(cost);
        let card_clone = card.clone();
        player.hand.push(card);
        
        Ok(card_clone)
    }
    
    /// 刷新公共卡池 (消耗行动力)
    pub fn gc_refresh_pool(&mut self, player_id: &str) -> Result<(), GcError> {
        // 检查是否轮到该玩家
        if self.gc_current_player_id() != Some(player_id) {
            return Err(GcError::GcNotYourTurn);
        }
        
        // 检查玩家行动力
        let player = self.gc_find_player(player_id)
            .ok_or(GcError::GcPlayerNotFound)?;
        
        let cost = self.card_pool.config.refresh_cost;
        if !player.stats.gc_has_action_points(cost) {
            return Err(GcError::GcNotEnoughActionPoints);
        }
        
        // 消耗行动力
        let player = self.gc_find_player_mut(player_id).unwrap();
        player.stats.gc_use_action_points(cost);
        
        // 刷新卡池
        self.card_pool.gc_refresh_display();
        
        Ok(())
    }
    
    // =========================================================================
    // 战场部署相关
    // =========================================================================
    
    /// 部署卡牌到战场 (消耗行动力)
    pub fn gc_deploy_card(
        &mut self,
        player_id: &str,
        card_id: &str,
        slot_index: usize,
    ) -> Result<(), GcError> {
        // 检查是否轮到该玩家
        if self.gc_current_player_id() != Some(player_id) {
            return Err(GcError::GcNotYourTurn);
        }
        
        // 检查玩家
        let player = self.gc_find_player(player_id)
            .ok_or(GcError::GcPlayerNotFound)?;
        
        // 检查行动力 (部署消耗 1 点)
        if !player.stats.gc_has_action_points(1) {
            return Err(GcError::GcNotEnoughActionPoints);
        }
        
        // 检查槽位
        if slot_index >= 5 {
            return Err(GcError::GcInvalidSlot);
        }
        
        if !player.battlefield.slots[slot_index].gc_is_empty() {
            return Err(GcError::GcSlotOccupied);
        }
        
        // 检查卡牌在手牌中
        if player.gc_find_card_in_hand(card_id).is_none() {
            return Err(GcError::GcCardNotInHand);
        }
        
        // 执行部署
        let player = self.gc_find_player_mut(player_id).unwrap();
        player.stats.gc_use_action_points(1);
        
        if let Err(e) = player.gc_deploy_to_battlefield(card_id, slot_index) {
            return Err(GcError::GcInvalidAction(e));
        }
        
        Ok(())
    }
    
    /// 获取玩家战场状态
    pub fn gc_get_battlefield(&self, player_id: &str) -> Option<&crate::GcBattlefield> {
        self.gc_find_player(player_id).map(|p| &p.battlefield)
    }
    
    /// 执行回合结束战斗 (双方战场卡牌互相攻击)
    /// 返回战斗结果
    pub fn gc_execute_turn_combat(&mut self, current_player_id: &str) -> Option<GcEndTurnResult> {
        // 找到双方玩家索引
        let current_idx = self.players.iter().position(|p| p.id == current_player_id)?;
        let opponent_idx = (current_idx + 1) % self.players.len();
        
        if opponent_idx == current_idx {
            return None; // 只有一个玩家
        }
        
        // 启用当前玩家战场卡牌的攻击能力
        self.players[current_idx].battlefield.gc_on_turn_start();
        
        // 分离出两个战场进行战斗
        // 由于 Rust 借用规则，需要克隆来处理
        let mut player_bf = self.players[current_idx].battlefield.clone();
        let mut opponent_bf = self.players[opponent_idx].battlefield.clone();
        
        // 当前玩家攻击对手
        let player_combat = player_bf.gc_attack_battlefield(&mut opponent_bf);
        let opponent_damage = player_combat.player_damage;
        
        // 对手反击 (如果对手战场有可攻击的卡牌)
        opponent_bf.gc_on_turn_start(); // 启用对手攻击
        let opponent_combat = opponent_bf.gc_attack_battlefield(&mut player_bf);
        let player_damage = opponent_combat.player_damage;
        
        // 更新战场状态
        self.players[current_idx].battlefield = player_bf;
        self.players[opponent_idx].battlefield = opponent_bf;
        
        // 应用伤害到玩家
        self.players[current_idx].stats.gc_take_damage(player_damage);
        self.players[opponent_idx].stats.gc_take_damage(opponent_damage);
        
        // 检查战斗是否结束
        self.gc_check_battle_end();
        
        Some(GcEndTurnResult {
            player_combat,
            opponent_combat,
            player_damage_taken: player_damage,
            opponent_damage_taken: opponent_damage,
            battle_ended: self.gc_is_finished(),
            winner_id: self.winner_id.clone(),
        })
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
