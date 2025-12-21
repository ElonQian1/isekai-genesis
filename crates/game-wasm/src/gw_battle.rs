//! WASM 战斗系统绑定
//!
//! 模块: game-wasm
//! 前缀: Gw
//! 文档: 文档/02-game-wasm.md

use wasm_bindgen::prelude::*;
use game_core::*;
use crate::gw_utils::*;

// =============================================================================
// GwBattle - 战斗管理器
// =============================================================================

/// WASM 导出的战斗管理器
#[wasm_bindgen]
pub struct GwBattle {
    state: GcBattleState,
}

#[wasm_bindgen]
impl GwBattle {
    /// 创建新战斗 (空玩家列表，需要后续添加)
    #[wasm_bindgen(constructor)]
    pub fn new(battle_id: &str) -> Self {
        Self {
            state: GcBattleState::gc_new(battle_id.to_string(), Vec::new()),
        }
    }

    /// 添加玩家
    pub fn add_player(&mut self, id: &str, name: &str) -> bool {
        let player = GcPlayer::gc_new(id.to_string(), name.to_string());
        
        if self.state.players.len() < 2 {
            self.state.players.push(player);
            gw_log(&format!("玩家 {} 加入战斗", name));
            true
        } else {
            gw_warn("战斗已满员");
            false
        }
    }

    /// 开始战斗
    pub fn start(&mut self) -> bool {
        if self.state.players.len() != 2 {
            gw_warn("需要2名玩家才能开始");
            return false;
        }

        self.state.phase = GcBattlePhase::Playing;
        self.state.current_player_index = 0;
        self.state.turn = 1;
        
        // 初始抽牌
        for player in &mut self.state.players {
            player.gc_draw_cards(5); // 初始5张牌
        }
        
        gw_log("⚔️ 战斗开始!");
        true
    }

    /// 获取战斗 ID
    #[wasm_bindgen(getter)]
    pub fn battle_id(&self) -> String {
        self.state.id.clone()
    }

    /// 获取当前回合数
    #[wasm_bindgen(getter)]
    pub fn turn(&self) -> u32 {
        self.state.turn
    }

    /// 获取当前玩家索引
    #[wasm_bindgen(getter)]
    pub fn current_player_index(&self) -> usize {
        self.state.current_player_index
    }

    /// 是否已结束
    #[wasm_bindgen(getter)]
    pub fn is_ended(&self) -> bool {
        matches!(self.state.phase, GcBattlePhase::Finished)
    }

    /// 获取获胜者 ID (如果有)
    #[wasm_bindgen(getter)]
    pub fn winner_id(&self) -> Option<String> {
        self.state.winner_id.clone()
    }

    /// 出牌
    pub fn play_card(
        &mut self,
        player_id: &str,
        card_id: &str,
        target_id: &str,
    ) -> Result<String, JsValue> {
        // 验证出牌
        if let Err(e) = gc_validate_play_card(&self.state, player_id, card_id, target_id) {
            return Err(JsValue::from_str(&e.to_string()));
        }

        // 执行出牌
        let result = gc_execute_play_card(&mut self.state, player_id, card_id, target_id);
        
        if result.success {
            gw_log(&format!("玩家 {} 打出卡牌 {}", player_id, card_id));
            
            // 检查是否有人死亡
            self.check_battle_end();
        }
        
        gw_to_json(&result)
    }

    /// 结束回合
    pub fn end_turn(&mut self, player_id: &str) -> Result<(), JsValue> {
        // 验证是否是当前玩家
        if self.state.current_player_index < self.state.players.len() {
            let current = &self.state.players[self.state.current_player_index];
            if current.id != player_id {
                return Err(JsValue::from_str("不是你的回合"));
            }
        }

        // 切换玩家
        self.state.current_player_index = (self.state.current_player_index + 1) % self.state.players.len();
        
        // 如果回到第一个玩家，增加回合数
        if self.state.current_player_index == 0 {
            self.state.turn += 1;
        }

        // 新玩家回合开始：恢复能量，抽牌
        if let Some(player) = self.state.players.get_mut(self.state.current_player_index) {
            player.stats.energy = player.stats.max_energy;
            player.gc_draw_cards(GcConfig::DRAW_PER_TURN);
        }

        gw_log(&format!("回合结束，现在是玩家 {} 的回合", self.state.current_player_index));
        Ok(())
    }

    /// 获取完整战斗状态 JSON
    pub fn get_state_json(&self) -> Result<String, JsValue> {
        gw_to_json(&self.state)
    }

    /// 获取完整战斗状态 JS 对象
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        gw_to_js_value(&self.state)
    }

    /// 获取指定玩家状态 JSON
    pub fn get_player_json(&self, player_id: &str) -> Result<String, JsValue> {
        self.state.players
            .iter()
            .find(|p| p.id == player_id)
            .map(|p| gw_to_json(p))
            .unwrap_or_else(|| Err(JsValue::from_str("玩家不存在")))
    }
}

// 内部方法
impl GwBattle {
    /// 检查战斗是否结束
    fn check_battle_end(&mut self) {
        let alive_players: Vec<_> = self.state.players
            .iter()
            .filter(|p| p.stats.gc_is_alive())
            .collect();

        if alive_players.len() <= 1 {
            self.state.phase = GcBattlePhase::Finished;
            
            if let Some(winner) = alive_players.first() {
                self.state.winner_id = Some(winner.id.clone());
                gw_log(&format!("🏆 战斗结束! 获胜者: {}", winner.name));
            } else {
                gw_log("⚖️ 战斗结束! 平局");
            }
        }
    }
}

// =============================================================================
// 便捷函数
// =============================================================================

/// 快速创建测试战斗
#[wasm_bindgen]
pub fn gw_create_test_battle() -> GwBattle {
    let mut battle = GwBattle::new("test-battle-1");
    battle.add_player("player1", "玩家一");
    battle.add_player("player2", "玩家二");
    battle.start();
    battle
}

/// 计算伤害预览 (纯函数)
#[wasm_bindgen]
pub fn gw_preview_damage(attacker_attack: u32, target_defense: u32, card_damage: u32) -> JsValue {
    // 简化版伤害预览计算
    let base_damage = card_damage + attacker_attack;
    let defense_reduction = (target_defense as f32 * 0.3) as u32;
    let final_damage = base_damage.saturating_sub(defense_reduction);
    
    let result = GcDamageResult::new(base_damage, defense_reduction, final_damage);
    gw_to_js_value(&result).unwrap_or(JsValue::NULL)
}
