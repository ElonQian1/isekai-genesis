//! 怪兽系统 WASM 绑定
//!
//! 提供怪兽召唤验证、祭品计算、战斗伤害计算等功能

use wasm_bindgen::prelude::*;
use game_core::{
    GcMonster, GcMonsterAttribute, 
    gc_validate_normal_summon, gc_validate_tribute_summon,
    gc_calculate_battle_damage, GcTerrainType,
};
use serde::{Deserialize, Serialize};

/// 怪兽信息 (JS端)
#[derive(Serialize, Deserialize)]
pub struct GwMonsterInfo {
    pub id: String,
    pub name: String,
    pub level: u8,
    pub attribute: String,
    pub atk: u32,
    pub def: u32,
    pub hp: u32,
    pub max_hp: u32,
    pub slot: Option<u8>,
    pub can_attack: bool,
}

fn attr_to_string(a: GcMonsterAttribute) -> String {
    match a {
        GcMonsterAttribute::None => "none",
        GcMonsterAttribute::Fire => "fire",
        GcMonsterAttribute::Water => "water",
        GcMonsterAttribute::Wind => "wind",
        GcMonsterAttribute::Earth => "earth",
        GcMonsterAttribute::Light => "light",
        GcMonsterAttribute::Dark => "dark",
    }.to_string()
}

impl From<&GcMonster> for GwMonsterInfo {
    fn from(m: &GcMonster) -> Self {
        Self {
            id: m.id.clone(),
            name: m.name.clone(),
            level: m.level,
            attribute: attr_to_string(m.attribute),
            atk: m.base_atk,
            def: m.base_def,
            hp: m.current_hp,
            max_hp: m.max_hp,
            slot: m.slot,
            can_attack: m.can_attack,
        }
    }
}

/// 获取需要的祭品数量
#[wasm_bindgen]
pub fn gw_required_tributes(level: u8) -> u8 {
    game_core::gc_required_tributes(level)
}

/// 创建测试怪兽
#[wasm_bindgen]
pub fn gw_create_test_monster(id: &str, name: &str, level: u8, attr: &str, atk: u32, def: u32, hp: u32) -> JsValue {
    let attribute = match attr.to_lowercase().as_str() {
        "fire" => GcMonsterAttribute::Fire,
        "water" => GcMonsterAttribute::Water,
        "wind" => GcMonsterAttribute::Wind,
        "earth" => GcMonsterAttribute::Earth,
        "light" => GcMonsterAttribute::Light,
        "dark" => GcMonsterAttribute::Dark,
        _ => GcMonsterAttribute::None,
    };
    
    let monster = GcMonster::new(id, name, level, attribute, atk, def, hp);
    let info = GwMonsterInfo::from(&monster);
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}

// =============================================================================
// 召唤验证导出
// =============================================================================

/// 召唤验证结果
#[derive(Serialize, Deserialize)]
pub struct GwSummonValidation {
    pub valid: bool,
    pub error: Option<String>,
}

/// 验证普通召唤 (level ≤ 4)
/// 返回 { valid: bool, error?: string }
#[wasm_bindgen]
pub fn gw_validate_normal_summon(level: u8, normal_summon_used: bool) -> JsValue {
    match gc_validate_normal_summon(level, normal_summon_used) {
        Ok(()) => {
            let r = GwSummonValidation { valid: true, error: None };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
        Err(e) => {
            let msg = match e {
                game_core::GcSummonError::NormalSummonUsed => "本回合已普通召唤".to_string(),
                game_core::GcSummonError::LevelTooHigh(lv) => format!("等级{}过高，需要祭品", lv),
                _ => format!("{:?}", e),
            };
            let r = GwSummonValidation { valid: false, error: Some(msg) };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
    }
}

/// 验证祭品召唤
/// sacrifice_slots: JS 数组如 [0, 2]
/// occupied_slots: 5 个布尔值的数组，表示场上哪些槽位有怪兽
#[wasm_bindgen]
pub fn gw_validate_tribute_summon(level: u8, sacrifice_slots: &[u8], occupied_slots: &[u8]) -> JsValue {
    // 将 u8 数组转为 bool 数组
    let mut slots: [bool; 5] = [false; 5];
    for (i, &v) in occupied_slots.iter().take(5).enumerate() {
        slots[i] = v != 0;
    }
    
    match gc_validate_tribute_summon(level, sacrifice_slots, &slots) {
        Ok(()) => {
            let r = GwSummonValidation { valid: true, error: None };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
        Err(e) => {
            let msg = match e {
                game_core::GcSummonError::InsufficientTributes { required, provided } =>
                    format!("祭品不足：需要{}个，提供{}个", required, provided),
                game_core::GcSummonError::InvalidTributeSlot(s) =>
                    format!("无效的祭品槽位: {}", s),
                _ => format!("{:?}", e),
            };
            let r = GwSummonValidation { valid: false, error: Some(msg) };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
    }
}

// =============================================================================
// 战斗伤害计算
// =============================================================================

/// 战斗结果 (JS端)
#[derive(Serialize, Deserialize)]
pub struct GwBattleResult {
    pub attacker_atk: u32,
    pub defender_def: u32,
    pub damage: u32,
    pub defender_destroyed: bool,
    pub counter_damage: u32,
    pub attacker_destroyed: bool,
}

fn string_to_terrain(s: &str) -> GcTerrainType {
    match s.to_lowercase().as_str() {
        "volcano" => GcTerrainType::Volcano,
        "glacier" => GcTerrainType::Glacier,
        "ocean" => GcTerrainType::Ocean,
        "swamp" => GcTerrainType::Swamp,
        "shadow" => GcTerrainType::Shadow,
        "holy" => GcTerrainType::Holy,
        _ => GcTerrainType::Plain,
    }
}

fn string_to_attribute(s: &str) -> GcMonsterAttribute {
    match s.to_lowercase().as_str() {
        "fire" => GcMonsterAttribute::Fire,
        "water" => GcMonsterAttribute::Water,
        "wind" => GcMonsterAttribute::Wind,
        "earth" => GcMonsterAttribute::Earth,
        "light" => GcMonsterAttribute::Light,
        "dark" => GcMonsterAttribute::Dark,
        _ => GcMonsterAttribute::None,
    }
}

/// 计算怪兽战斗伤害
/// 返回 { attacker_atk, defender_def, damage, defender_destroyed, counter_damage, attacker_destroyed }
#[wasm_bindgen]
pub fn gw_calculate_battle_damage(
    attacker_atk: u32,
    attacker_hp: u32,
    attacker_attr: &str,
    attacker_terrain: &str,
    defender_def: u32,
    defender_hp: u32,
    defender_attr: &str,
    defender_terrain: &str,
) -> JsValue {
    // 创建临时怪兽实例进行计算
    let attacker = GcMonster::new(
        "attacker", "attacker", 4,
        string_to_attribute(attacker_attr),
        attacker_atk, 0, attacker_hp
    );
    let defender = GcMonster::new(
        "defender", "defender", 4,
        string_to_attribute(defender_attr),
        0, defender_def, defender_hp
    );
    
    let result = gc_calculate_battle_damage(
        &attacker,
        &defender,
        string_to_terrain(attacker_terrain),
        string_to_terrain(defender_terrain),
    );
    
    let gw_result = GwBattleResult {
        attacker_atk: result.attacker_atk,
        defender_def: result.defender_def,
        damage: result.damage,
        defender_destroyed: result.defender_destroyed,
        counter_damage: result.counter_damage,
        attacker_destroyed: result.attacker_destroyed,
    };
    
    serde_wasm_bindgen::to_value(&gw_result).unwrap_or(JsValue::NULL)
}

/// 计算直接攻击伤害 (攻击玩家)
#[wasm_bindgen]
pub fn gw_calculate_direct_attack(
    attacker_atk: u32,
    attacker_attr: &str,
    terrain: &str,
) -> u32 {
    let attacker = GcMonster::new(
        "attacker", "attacker", 4,
        string_to_attribute(attacker_attr),
        attacker_atk, 0, 1000
    );
    attacker.effective_atk(string_to_terrain(terrain))
}

// =============================================================================
// 特殊召唤
// =============================================================================

/// 验证特殊召唤
/// 返回 { valid: bool, error?: string }
#[wasm_bindgen]
pub fn gw_validate_special_summon(
    is_main_phase: bool,
    target_slot: u8,
    occupied_slots: &[u8],
) -> JsValue {
    // 将 u8 数组转为 bool 数组
    let mut slots: [bool; 5] = [false; 5];
    for (i, &v) in occupied_slots.iter().take(5).enumerate() {
        slots[i] = v != 0;
    }
    
    match game_core::gc_validate_special_summon(is_main_phase, target_slot, &slots) {
        Ok(()) => {
            let r = GwSummonValidation { valid: true, error: None };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
        Err(e) => {
            let msg = match e {
                game_core::GcSummonError::NotYourTurn => "只能在主阶段特殊召唤".to_string(),
                game_core::GcSummonError::SlotOccupied(s) => format!("槽位{}已被占用", s),
                game_core::GcSummonError::InvalidTributeSlot(s) => format!("无效的槽位: {}", s),
                _ => format!("{:?}", e),
            };
            let r = GwSummonValidation { valid: false, error: Some(msg) };
            serde_wasm_bindgen::to_value(&r).unwrap_or(JsValue::NULL)
        }
    }
}
