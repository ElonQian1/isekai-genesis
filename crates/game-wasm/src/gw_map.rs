//! 地图系统 WASM 绑定
//!
//! 模块: game-wasm
//! 前缀: gw_ / Gw
//! 文档: 文档/02-game-wasm.md
//!
//! 暴露地图系统给 JavaScript:
//! - 世界管理
//! - 玩家移动
//! - 地图查询
//! - 交互处理

use wasm_bindgen::prelude::*;
use game_core::{
    GcWorld, GcPosition, GcDirection, GcMoveResult, GcInteraction,
    gc_create_default_world, gc_create_town_map, gc_create_forest_map, gc_create_boss_arena_map,
};
use serde::{Serialize, Deserialize};

use crate::gw_log;

// =============================================================================
// JS 友好类型
// =============================================================================

/// JS 友好的位置结构
#[derive(Serialize, Deserialize)]
pub struct GwPosition {
    pub x: i32,
    pub y: i32,
}

impl From<GcPosition> for GwPosition {
    fn from(pos: GcPosition) -> Self {
        Self { x: pos.x, y: pos.y }
    }
}

impl From<GwPosition> for GcPosition {
    fn from(pos: GwPosition) -> Self {
        Self { x: pos.x, y: pos.y }
    }
}

/// JS 友好的移动结果
#[derive(Serialize, Deserialize)]
pub struct GwMoveResult {
    pub success: bool,
    pub new_position: GwPosition,
    pub interaction: Option<GwInteraction>,
}

impl From<GcMoveResult> for GwMoveResult {
    fn from(result: GcMoveResult) -> Self {
        Self {
            success: result.success,
            new_position: result.new_position.into(),
            interaction: result.interaction.map(|i| i.into()),
        }
    }
}

/// JS 友好的交互事件
#[derive(Serialize, Deserialize)]
pub struct GwInteraction {
    pub interaction_type: String,
    pub entity_id: String,
}

impl From<GcInteraction> for GwInteraction {
    fn from(interaction: GcInteraction) -> Self {
        match interaction {
            GcInteraction::Portal { portal_id } => Self {
                interaction_type: "portal".to_string(),
                entity_id: portal_id,
            },
            GcInteraction::Npc { npc_id } => Self {
                interaction_type: "npc".to_string(),
                entity_id: npc_id,
            },
            GcInteraction::Monster { monster_id } => Self {
                interaction_type: "monster".to_string(),
                entity_id: monster_id,
            },
            GcInteraction::Chest { chest_id } => Self {
                interaction_type: "chest".to_string(),
                entity_id: chest_id,
            },
        }
    }
}

/// JS 友好的瓦片信息
#[derive(Serialize, Deserialize)]
pub struct GwTileInfo {
    pub tile_type: String,
    pub walkable: bool,
    pub interactable: bool,
    pub entity_id: Option<String>,
    pub color: (u8, u8, u8),
}

/// JS 友好的地图信息
#[derive(Serialize, Deserialize)]
pub struct GwMapInfo {
    pub id: String,
    pub name: String,
    pub width: usize,
    pub height: usize,
    pub spawn_point: GwPosition,
}

/// JS 友好的玩家信息
#[derive(Serialize, Deserialize)]
pub struct GwPlayerMapInfo {
    pub player_id: String,
    pub map_id: String,
    pub position: GwPosition,
    pub direction: String,
}

// =============================================================================
// WASM 世界管理器
// =============================================================================

/// WASM 世界管理器
/// 封装 GcWorld 并提供 JS 友好的 API
#[wasm_bindgen]
pub struct GwWorldManager {
    world: GcWorld,
}

#[wasm_bindgen]
impl GwWorldManager {
    /// 创建新的世界管理器（默认地图）
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        gw_log("📍 创建游戏世界...");
        Self {
            world: gc_create_default_world(),
        }
    }
    
    /// 添加玩家到世界
    #[wasm_bindgen]
    pub fn add_player(&mut self, player_id: &str, map_id: &str) -> bool {
        gw_log(&format!("📍 玩家 {} 进入地图 {}", player_id, map_id));
        self.world.gc_add_player(player_id, map_id).is_ok()
    }
    
    /// 移动玩家
    #[wasm_bindgen]
    pub fn move_player(&mut self, player_id: &str, direction: &str) -> JsValue {
        let dir = match direction {
            "up" => GcDirection::Up,
            "down" => GcDirection::Down,
            "left" => GcDirection::Left,
            "right" => GcDirection::Right,
            _ => {
                let result = GwMoveResult {
                    success: false,
                    new_position: GwPosition { x: 0, y: 0 },
                    interaction: None,
                };
                return serde_wasm_bindgen::to_value(&result).unwrap();
            }
        };
        
        match self.world.gc_move_player(player_id, dir) {
            Ok(result) => {
                let gw_result: GwMoveResult = result.into();
                serde_wasm_bindgen::to_value(&gw_result).unwrap()
            }
            Err(_) => {
                let result = GwMoveResult {
                    success: false,
                    new_position: GwPosition { x: 0, y: 0 },
                    interaction: None,
                };
                serde_wasm_bindgen::to_value(&result).unwrap()
            }
        }
    }
    
    /// 传送玩家到指定地图出生点
    #[wasm_bindgen]
    pub fn teleport_player(&mut self, player_id: &str, map_id: &str) -> bool {
        gw_log(&format!("📍 玩家 {} 传送到 {}", player_id, map_id));
        // 获取目标地图的出生点
        if let Some(map) = self.world.gc_get_map(map_id) {
            let spawn = map.spawn_point;
            self.world.gc_teleport_player(player_id, map_id, spawn).is_ok()
        } else {
            false
        }
    }
    
    /// 传送玩家到指定位置
    #[wasm_bindgen]
    pub fn teleport_player_to(&mut self, player_id: &str, map_id: &str, x: i32, y: i32) -> bool {
        let pos = GcPosition::gc_new(x, y);
        self.world.gc_teleport_player(player_id, map_id, pos).is_ok()
    }
    
    /// 获取玩家信息
    #[wasm_bindgen]
    pub fn get_player(&self, player_id: &str) -> JsValue {
        if let Some(player) = self.world.gc_get_player(player_id) {
            let info = GwPlayerMapInfo {
                player_id: player.player_id.clone(),
                map_id: player.current_map_id.clone(),
                position: player.position.into(),
                direction: format!("{:?}", player.direction),
            };
            serde_wasm_bindgen::to_value(&info).unwrap()
        } else {
            JsValue::NULL
        }
    }
    
    /// 获取所有地图 ID
    #[wasm_bindgen]
    pub fn get_map_ids(&self) -> JsValue {
        let ids: Vec<&String> = self.world.maps.iter().map(|m| &m.id).collect();
        serde_wasm_bindgen::to_value(&ids).unwrap()
    }
    
    /// 获取地图信息
    #[wasm_bindgen]
    pub fn get_map_info(&self, map_id: &str) -> JsValue {
        if let Some(map) = self.world.gc_get_map(map_id) {
            let info = GwMapInfo {
                id: map.id.clone(),
                name: map.name.clone(),
                width: map.width,
                height: map.height,
                spawn_point: map.spawn_point.into(),
            };
            serde_wasm_bindgen::to_value(&info).unwrap()
        } else {
            JsValue::NULL
        }
    }
    
    /// 获取瓦片信息
    #[wasm_bindgen]
    pub fn get_tile(&self, map_id: &str, x: i32, y: i32) -> JsValue {
        if let Some(map) = self.world.gc_get_map(map_id) {
            let pos = GcPosition::gc_new(x, y);
            if let Some(tile) = map.gc_get_tile(&pos) {
                let info = GwTileInfo {
                    tile_type: format!("{:?}", tile.tile_type),
                    walkable: tile.gc_is_walkable(),
                    interactable: tile.gc_is_interactable(),
                    entity_id: tile.entity_id.clone(),
                    color: tile.tile_type.gc_color(),
                };
                return serde_wasm_bindgen::to_value(&info).unwrap();
            }
        }
        JsValue::NULL
    }
    
    /// 获取地图的 ASCII 表示（调试用）
    #[wasm_bindgen]
    pub fn get_map_ascii(&self, map_id: &str) -> String {
        if let Some(map) = self.world.gc_get_map(map_id) {
            map.gc_to_ascii()
        } else {
            "地图不存在".to_string()
        }
    }
    
    /// 检查位置是否可通行
    #[wasm_bindgen]
    pub fn can_walk(&self, map_id: &str, x: i32, y: i32) -> bool {
        if let Some(map) = self.world.gc_get_map(map_id) {
            map.gc_can_walk(&GcPosition::gc_new(x, y))
        } else {
            false
        }
    }
    
    /// 获取地图所有瓦片数据（用于渲染）
    #[wasm_bindgen]
    pub fn get_map_tiles(&self, map_id: &str) -> JsValue {
        if let Some(map) = self.world.gc_get_map(map_id) {
            let tiles: Vec<Vec<GwTileInfo>> = map.tiles.iter().map(|row| {
                row.iter().map(|tile| {
                    GwTileInfo {
                        tile_type: format!("{:?}", tile.tile_type),
                        walkable: tile.gc_is_walkable(),
                        interactable: tile.gc_is_interactable(),
                        entity_id: tile.entity_id.clone(),
                        color: tile.tile_type.gc_color(),
                    }
                }).collect()
            }).collect();
            serde_wasm_bindgen::to_value(&tiles).unwrap()
        } else {
            JsValue::NULL
        }
    }
}

impl Default for GwWorldManager {
    fn default() -> Self {
        Self::new()
    }
}

// =============================================================================
// 独立函数
// =============================================================================

/// 创建主城地图 JSON
#[wasm_bindgen]
pub fn gw_create_town_map_json() -> String {
    let map = gc_create_town_map();
    serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string())
}

/// 创建森林地图 JSON
#[wasm_bindgen]
pub fn gw_create_forest_map_json() -> String {
    let map = gc_create_forest_map();
    serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string())
}

/// 创建 Boss 竞技场地图 JSON
#[wasm_bindgen]
pub fn gw_create_boss_arena_json() -> String {
    let map = gc_create_boss_arena_map();
    serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string())
}
