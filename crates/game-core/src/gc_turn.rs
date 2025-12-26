//! 战斗回合系统
//!
//! 回合阶段: 抽牌 → 主阶段1 → 战斗 → 主阶段2 → 结束
//! 类似《游戏王》的回合制

use serde::{Deserialize, Serialize};

/// 回合阶段
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum GcTurnPhase {
    /// 抽牌阶段
    #[default]
    Draw,
    /// 主阶段1 (可召唤、发动魔法)
    Main1,
    /// 战斗阶段 (怪兽攻击)
    Battle,
    /// 主阶段2 (战斗后可继续操作)
    Main2,
    /// 结束阶段
    End,
}

impl GcTurnPhase {
    /// 获取阶段名称
    pub fn name(&self) -> &'static str {
        match self {
            GcTurnPhase::Draw => "抽牌阶段",
            GcTurnPhase::Main1 => "主阶段1",
            GcTurnPhase::Battle => "战斗阶段",
            GcTurnPhase::Main2 => "主阶段2",
            GcTurnPhase::End => "结束阶段",
        }
    }

    /// 进入下一阶段
    pub fn next(&self) -> GcTurnPhase {
        match self {
            GcTurnPhase::Draw => GcTurnPhase::Main1,
            GcTurnPhase::Main1 => GcTurnPhase::Battle,
            GcTurnPhase::Battle => GcTurnPhase::Main2,
            GcTurnPhase::Main2 => GcTurnPhase::End,
            GcTurnPhase::End => GcTurnPhase::Draw, // 下一回合
        }
    }

    /// 是否可以召唤怪兽
    pub fn can_summon(&self) -> bool {
        matches!(self, GcTurnPhase::Main1 | GcTurnPhase::Main2)
    }

    /// 是否可以发动魔法卡
    pub fn can_play_spell(&self) -> bool {
        matches!(self, GcTurnPhase::Main1 | GcTurnPhase::Main2)
    }

    /// 是否可以攻击
    pub fn can_attack(&self) -> bool {
        matches!(self, GcTurnPhase::Battle)
    }
}

/// 回合状态
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcTurnState {
    /// 当前回合数
    pub turn_number: u32,
    /// 当前阶段
    pub phase: GcTurnPhase,
    /// 是否玩家回合 (false = 敌方回合)
    pub is_player_turn: bool,
    /// 本回合是否已普通召唤
    pub normal_summon_used: bool,
    /// 本回合已攻击的怪兽槽位
    pub attacked_slots: Vec<u8>,
}

impl Default for GcTurnState {
    fn default() -> Self {
        Self {
            turn_number: 1,
            phase: GcTurnPhase::Draw,
            is_player_turn: true,
            normal_summon_used: false,
            attacked_slots: Vec::new(),
        }
    }
}

impl GcTurnState {
    /// 进入下一阶段
    pub fn next_phase(&mut self) {
        self.phase = self.phase.next();
        
        // 如果进入新回合(从End到Draw)，重置状态
        if self.phase == GcTurnPhase::Draw {
            self.turn_number += 1;
            self.is_player_turn = !self.is_player_turn;
            self.normal_summon_used = false;
            self.attacked_slots.clear();
        }
    }

    /// 跳过战斗阶段直接到主阶段2
    pub fn skip_battle(&mut self) {
        if self.phase == GcTurnPhase::Main1 {
            self.phase = GcTurnPhase::Main2;
        }
    }

    /// 直接结束回合
    pub fn end_turn(&mut self) {
        self.phase = GcTurnPhase::End;
        self.next_phase(); // 触发回合切换
    }

    /// 标记怪兽已攻击
    pub fn mark_attacked(&mut self, slot: u8) {
        if !self.attacked_slots.contains(&slot) {
            self.attacked_slots.push(slot);
        }
    }

    /// 检查怪兽是否可以攻击
    pub fn can_monster_attack(&self, slot: u8) -> bool {
        self.phase.can_attack() && !self.attacked_slots.contains(&slot)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_flow() {
        let mut state = GcTurnState::default();
        assert_eq!(state.phase, GcTurnPhase::Draw);
        assert!(state.is_player_turn);
        
        state.next_phase();
        assert_eq!(state.phase, GcTurnPhase::Main1);
        
        state.next_phase();
        assert_eq!(state.phase, GcTurnPhase::Battle);
        
        state.next_phase();
        assert_eq!(state.phase, GcTurnPhase::Main2);
        
        state.next_phase();
        assert_eq!(state.phase, GcTurnPhase::End);
        
        state.next_phase();
        assert_eq!(state.phase, GcTurnPhase::Draw);
        assert!(!state.is_player_turn); // 切换到敌方回合
        assert_eq!(state.turn_number, 2);
    }
}
