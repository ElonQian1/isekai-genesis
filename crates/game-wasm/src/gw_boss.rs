//! WASM Boss 系统绑定
//!
//! 模块: game-wasm
//! 前缀: Gw
//! 文档: 文档/02-game-wasm.md

use wasm_bindgen::prelude::*;
use game_core::*;
use crate::gw_utils::*;

// =============================================================================
// GwBoss - Boss 管理器
// =============================================================================

/// WASM 导出的 Boss 管理器
#[wasm_bindgen]
pub struct GwBoss {
    boss: GcBoss,
}

#[wasm_bindgen]
impl GwBoss {
    /// 创建暗影潜伏者 (小型 Boss)
    #[wasm_bindgen(js_name = createShadowLurker)]
    pub fn create_shadow_lurker() -> Self {
        Self {
            boss: gc_create_shadow_lurker(),
        }
    }
    
    /// 创建深渊泰坦 (周本 Boss)
    #[wasm_bindgen(js_name = createAbyssalTitan)]
    pub fn create_abyssal_titan() -> Self {
        Self {
            boss: gc_create_abyssal_titan(),
        }
    }
    
    // =========================================================================
    // 属性获取
    // =========================================================================
    
    /// 获取 Boss ID
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.boss.id.clone()
    }
    
    /// 获取 Boss 名称
    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String {
        self.boss.name.clone()
    }
    
    /// 获取 Boss 描述
    #[wasm_bindgen(getter)]
    pub fn description(&self) -> String {
        self.boss.description.clone()
    }
    
    /// 获取当前生命值
    #[wasm_bindgen(getter, js_name = currentHp)]
    pub fn current_hp(&self) -> u32 {
        self.boss.current_hp
    }
    
    /// 获取最大生命值
    #[wasm_bindgen(getter, js_name = maxHp)]
    pub fn max_hp(&self) -> u32 {
        self.boss.max_hp
    }
    
    /// 获取当前攻击力
    #[wasm_bindgen(getter, js_name = currentAttack)]
    pub fn current_attack(&self) -> u32 {
        self.boss.current_attack
    }
    
    /// 获取防御力
    #[wasm_bindgen(getter)]
    pub fn defense(&self) -> u32 {
        self.boss.defense
    }
    
    /// 获取当前怒气值
    #[wasm_bindgen(getter, js_name = currentRage)]
    pub fn current_rage(&self) -> u32 {
        self.boss.current_rage
    }
    
    /// 获取最大怒气值
    #[wasm_bindgen(getter, js_name = maxRage)]
    pub fn max_rage(&self) -> u32 {
        self.boss.max_rage
    }
    
    /// 获取复活次数
    #[wasm_bindgen(getter, js_name = reviveCount)]
    pub fn revive_count(&self) -> u32 {
        self.boss.revive_count
    }
    
    /// 是否存活
    #[wasm_bindgen(getter, js_name = isAlive)]
    pub fn is_alive(&self) -> bool {
        self.boss.gc_is_alive()
    }
    
    /// 怒气是否已满
    #[wasm_bindgen(getter, js_name = isRageFull)]
    pub fn is_rage_full(&self) -> bool {
        self.boss.gc_is_rage_full()
    }
    
    // =========================================================================
    // 战斗方法
    // =========================================================================
    
    /// Boss 受到伤害
    /// 返回 { actualDamage: number, died: boolean }
    #[wasm_bindgen(js_name = takeDamage)]
    pub fn take_damage(&mut self, damage: u32) -> Result<JsValue, JsValue> {
        let (actual_damage, died) = self.boss.gc_take_damage(damage);
        
        gw_log(&format!(
            "⚔️ {} 受到 {} 点伤害 (实际 {}), HP: {}/{}",
            self.boss.name,
            damage,
            actual_damage,
            self.boss.current_hp,
            self.boss.max_hp
        ));
        
        #[derive(serde::Serialize)]
        struct DamageResult {
            actual_damage: u32,
            died: bool,
            hp_remaining: u32,
            rage_current: u32,
        }
        
        let result = DamageResult {
            actual_damage,
            died,
            hp_remaining: self.boss.current_hp,
            rage_current: self.boss.current_rage,
        };
        
        gw_to_js_value(&result)
    }
    
    /// 增加怒气
    #[wasm_bindgen(js_name = addRage)]
    pub fn add_rage(&mut self, amount: u32) {
        self.boss.gc_add_rage(amount);
        
        if self.boss.gc_is_rage_full() {
            gw_log(&format!("💢 {} 怒气已满!", self.boss.name));
        }
    }
    
    /// 获取当前可用技能 JSON
    #[wasm_bindgen(js_name = getAvailableSkill)]
    pub fn get_available_skill(&self) -> Result<JsValue, JsValue> {
        match self.boss.gc_select_skill() {
            Some(skill) => gw_to_js_value(skill),
            None => Ok(JsValue::NULL),
        }
    }
    
    /// 使用怒气技能后清空怒气
    #[wasm_bindgen(js_name = consumeRage)]
    pub fn consume_rage(&mut self) {
        self.boss.gc_consume_rage();
        gw_log(&format!("💨 {} 怒气已消耗", self.boss.name));
    }
    
    /// 回合结束 (技能冷却)
    #[wasm_bindgen(js_name = onTurnEnd)]
    pub fn on_turn_end(&mut self) {
        self.boss.gc_on_turn_end();
    }
    
    /// 设置嫁祸目标
    #[wasm_bindgen(js_name = setTargetOrganization)]
    pub fn set_target_organization(&mut self, org_id: &str) {
        self.boss.gc_set_target_organization(org_id);
        gw_log(&format!("🎯 {} 将攻击目标锁定为: {}", self.boss.name, org_id));
    }
    
    /// 获取完整状态 JSON
    #[wasm_bindgen(js_name = getStateJson)]
    pub fn get_state_json(&self) -> Result<String, JsValue> {
        gw_to_json(&self.boss)
    }
    
    /// 获取完整状态 JS 对象
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        gw_to_js_value(&self.boss)
    }
}

// =============================================================================
// GwRaidFormation - 8 人团队阵型
// =============================================================================

/// WASM 导出的团队阵型管理器
#[wasm_bindgen]
pub struct GwRaidFormation {
    formation: GcRaidFormation,
}

#[wasm_bindgen]
impl GwRaidFormation {
    /// 创建新阵型
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            formation: GcRaidFormation::gc_new(),
        }
    }
    
    /// 添加玩家到组织
    /// organization: "IronBlood" | "ShadowGuild" | "HolyLight" | "Wildland"
    /// position: "Front" | "Back"
    #[wasm_bindgen(js_name = addPlayer)]
    pub fn add_player(
        &mut self,
        organization: &str,
        player_id: &str,
        player_name: &str,
        position: &str,
    ) -> Result<(), JsValue> {
        let org = match organization {
            "IronBlood" => GcOrganization::IronBlood,
            "ShadowGuild" => GcOrganization::ShadowGuild,
            "HolyLight" => GcOrganization::HolyLight,
            "Wildland" => GcOrganization::Wildland,
            _ => return Err(JsValue::from_str("无效的组织类型")),
        };
        
        let pos = match position {
            "Front" => GcFormationPosition::Front,
            "Back" => GcFormationPosition::Back,
            _ => return Err(JsValue::from_str("无效的位置类型")),
        };
        
        self.formation.gc_add_player(org, player_id, player_name, pos)
            .map_err(|e| JsValue::from_str(&e))?;
        
        gw_log(&format!("👤 {} 加入 {} ({})", player_name, organization, position));
        Ok(())
    }
    
    /// 获取总玩家数
    #[wasm_bindgen(getter, js_name = totalPlayers)]
    pub fn total_players(&self) -> usize {
        self.formation.gc_total_players()
    }
    
    /// 是否已满员
    #[wasm_bindgen(getter, js_name = isFull)]
    pub fn is_full(&self) -> bool {
        self.formation.gc_is_full()
    }
    
    /// 获取存活玩家 ID 列表
    #[wasm_bindgen(js_name = getAlivePlayerIds)]
    pub fn get_alive_player_ids(&self) -> Result<JsValue, JsValue> {
        let ids: Vec<&str> = self.formation.gc_get_alive_player_ids();
        gw_to_js_value(&ids)
    }
    
    /// 获取玩家所属组织
    #[wasm_bindgen(js_name = getPlayerOrganization)]
    pub fn get_player_organization(&self, player_id: &str) -> Option<String> {
        self.formation.gc_get_player_organization(player_id)
            .map(|o| o.gc_name().to_string())
    }
    
    /// 获取伤害排行榜
    #[wasm_bindgen(js_name = getDamageRanking)]
    pub fn get_damage_ranking(&self) -> Result<JsValue, JsValue> {
        let ranking: Vec<_> = self.formation.gc_damage_ranking()
            .into_iter()
            .map(|(org, damage)| {
                serde_json::json!({
                    "organization": org.gc_name(),
                    "damage": damage,
                })
            })
            .collect();
        gw_to_js_value(&ranking)
    }
    
    /// 获取完整阵型状态 JSON
    #[wasm_bindgen(js_name = getStateJson)]
    pub fn get_state_json(&self) -> Result<String, JsValue> {
        gw_to_json(&self.formation)
    }
    
    /// 获取完整阵型状态 JS 对象
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        gw_to_js_value(&self.formation)
    }
}

impl Default for GwRaidFormation {
    fn default() -> Self {
        Self::new()
    }
}
