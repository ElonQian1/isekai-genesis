//! 战斗地形 WASM 绑定
//!
//! 将 game-core 的地形系统暴露给前端 TypeScript
//! 前缀: gw_ (函数)

use wasm_bindgen::prelude::*;
use game_core::{
    GcTerrainType, GcMonsterAttribute,
    GcWorldTerrainType, GcEnemyType,
    gc_get_terrain_modifier, gc_generate_battle_terrain,
};
use serde::{Deserialize, Serialize};

// =============================================================================
// 导出给 JS 的地形类型
// =============================================================================

/// 地形信息（用于 JS 端）
#[derive(Serialize, Deserialize)]
pub struct GwTerrainInfo {
    pub id: String,
    pub name: String,
    pub color: [u8; 4],
}

/// 地形修正信息（用于 JS 端）
#[derive(Serialize, Deserialize)]
pub struct GwTerrainModifierInfo {
    pub atk_percent: i32,
    pub def_percent: i32,
    pub hp_per_turn_percent: i32,
    pub dodge_bonus: i32,
    pub damage_taken_percent: i32,
    pub healing_bonus_percent: i32,
}

/// 战斗地形生成结果
#[derive(Serialize, Deserialize)]
pub struct GwBattleTerrainResult {
    pub player_terrain: String,
    pub enemy_terrain: String,
    pub player_terrain_name: String,
    pub enemy_terrain_name: String,
    pub player_color: [u8; 4],
    pub enemy_color: [u8; 4],
}

// =============================================================================
// 辅助函数
// =============================================================================

fn terrain_to_string(terrain: GcTerrainType) -> String {
    match terrain {
        GcTerrainType::Plain => "plain".to_string(),
        GcTerrainType::Volcano => "volcano".to_string(),
        GcTerrainType::Glacier => "glacier".to_string(),
        GcTerrainType::Ocean => "ocean".to_string(),
        GcTerrainType::Swamp => "swamp".to_string(),
        GcTerrainType::Shadow => "shadow".to_string(),
        GcTerrainType::Holy => "holy".to_string(),
        GcTerrainType::Forest => "forest".to_string(),
        GcTerrainType::Mountain => "mountain".to_string(),
    }
}

fn string_to_terrain(s: &str) -> GcTerrainType {
    match s.to_lowercase().as_str() {
        "volcano" => GcTerrainType::Volcano,
        "glacier" => GcTerrainType::Glacier,
        "ocean" => GcTerrainType::Ocean,
        "swamp" => GcTerrainType::Swamp,
        "shadow" => GcTerrainType::Shadow,
        "holy" => GcTerrainType::Holy,
        "forest" => GcTerrainType::Forest,
        "mountain" => GcTerrainType::Mountain,
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

fn string_to_world_terrain(s: &str) -> GcWorldTerrainType {
    match s.to_lowercase().as_str() {
        "desert" => GcWorldTerrainType::Desert,
        "snowfield" => GcWorldTerrainType::Snowfield,
        "waterside" => GcWorldTerrainType::Waterside,
        "highland" => GcWorldTerrainType::Highland,
        "woodland" => GcWorldTerrainType::Woodland,
        "cave" => GcWorldTerrainType::Cave,
        "ruins" => GcWorldTerrainType::Ruins,
        _ => GcWorldTerrainType::Grassland,
    }
}

fn string_to_enemy_type(s: &str) -> GcEnemyType {
    match s.to_lowercase().as_str() {
        "fire" | "firetype" => GcEnemyType::FireType,
        "water" | "watertype" => GcEnemyType::WaterType,
        "dark" | "darktype" => GcEnemyType::DarkType,
        "light" | "lighttype" => GcEnemyType::LightType,
        "boss" => GcEnemyType::Boss,
        _ => GcEnemyType::Normal,
    }
}

// =============================================================================
// WASM 导出函数
// =============================================================================

/// 获取所有地形类型信息
#[wasm_bindgen]
pub fn gw_get_all_terrains() -> JsValue {
    let terrains: Vec<GwTerrainInfo> = GcTerrainType::all()
        .iter()
        .map(|t| {
            let color = t.color();
            GwTerrainInfo {
                id: terrain_to_string(*t),
                name: t.name().to_string(),
                color: [color.0, color.1, color.2, color.3],
            }
        })
        .collect();

    serde_wasm_bindgen::to_value(&terrains).unwrap_or(JsValue::NULL)
}

/// 获取地形对怪兽的修正效果
/// 
/// # Arguments
/// * `terrain_id` - 地形ID（如 "volcano", "glacier"）
/// * `monster_attribute` - 怪兽属性（如 "fire", "water"）
#[wasm_bindgen]
pub fn gw_get_terrain_modifier(terrain_id: &str, monster_attribute: &str) -> JsValue {
    let terrain = string_to_terrain(terrain_id);
    let attribute = string_to_attribute(monster_attribute);
    let modifier = gc_get_terrain_modifier(terrain, attribute);

    let info = GwTerrainModifierInfo {
        atk_percent: modifier.atk_percent,
        def_percent: modifier.def_percent,
        hp_per_turn_percent: modifier.hp_per_turn_percent,
        dodge_bonus: modifier.dodge_bonus,
        damage_taken_percent: modifier.damage_taken_percent,
        healing_bonus_percent: modifier.healing_bonus_percent,
    };

    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}

/// 生成战斗地形
/// 
/// # Arguments
/// * `world_terrain` - 大世界地形类型（如 "grassland", "desert"）
/// * `enemy_type` - 敌人类型（如 "normal", "fire", "boss"）
/// * `random_seed` - 随机种子（由前端提供，如 Date.now()）
#[wasm_bindgen]
pub fn gw_generate_battle_terrain(world_terrain: &str, enemy_type: &str, random_seed: u32) -> JsValue {
    let world = string_to_world_terrain(world_terrain);
    let enemy = string_to_enemy_type(enemy_type);
    
    let (player_terrain, enemy_terrain) = gc_generate_battle_terrain(world, enemy, random_seed as u64);

    let player_color = player_terrain.color();
    let enemy_color = enemy_terrain.color();

    let result = GwBattleTerrainResult {
        player_terrain: terrain_to_string(player_terrain),
        enemy_terrain: terrain_to_string(enemy_terrain),
        player_terrain_name: player_terrain.name().to_string(),
        enemy_terrain_name: enemy_terrain.name().to_string(),
        player_color: [player_color.0, player_color.1, player_color.2, player_color.3],
        enemy_color: [enemy_color.0, enemy_color.1, enemy_color.2, enemy_color.3],
    };

    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// 应用地形修正到攻击力
#[wasm_bindgen]
pub fn gw_apply_terrain_atk(base_atk: u32, terrain_id: &str, monster_attribute: &str) -> u32 {
    let terrain = string_to_terrain(terrain_id);
    let attribute = string_to_attribute(monster_attribute);
    let modifier = gc_get_terrain_modifier(terrain, attribute);
    modifier.apply_atk(base_atk)
}

/// 应用地形修正到防御力
#[wasm_bindgen]
pub fn gw_apply_terrain_def(base_def: u32, terrain_id: &str, monster_attribute: &str) -> u32 {
    let terrain = string_to_terrain(terrain_id);
    let attribute = string_to_attribute(monster_attribute);
    let modifier = gc_get_terrain_modifier(terrain, attribute);
    modifier.apply_def(base_def)
}

/// 计算地形每回合 HP 变化
#[wasm_bindgen]
pub fn gw_calc_terrain_hp_change(max_hp: u32, terrain_id: &str, monster_attribute: &str) -> i32 {
    let terrain = string_to_terrain(terrain_id);
    let attribute = string_to_attribute(monster_attribute);
    let modifier = gc_get_terrain_modifier(terrain, attribute);
    modifier.calc_hp_change(max_hp)
}
