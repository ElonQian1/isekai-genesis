//! HTTP 路由处理
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use serde_json::{json, Value};

use crate::gs_error::GsError;
use crate::gs_state::GsAppState;

/// 健康检查响应
#[derive(Serialize)]
pub struct GsHealthResponse {
    pub status: String,
    pub timestamp: String,
}

/// 健康检查
pub async fn gs_health_check() -> Json<GsHealthResponse> {
    Json(GsHealthResponse {
        status: "ok".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// 获取版本信息
pub async fn gs_version() -> Json<Value> {
    Json(json!({
        "name": "Card Game Server",
        "version": env!("CARGO_PKG_VERSION"),
        "rust_version": "1.75+",
    }))
}

/// 房间列表响应
#[derive(Serialize)]
pub struct GsRoomListItem {
    pub id: String,
    pub name: String,
    pub player_count: usize,
    pub max_players: usize,
    pub is_playing: bool,
}

/// 获取房间列表
pub async fn gs_list_rooms(
    State(state): State<GsAppState>,
) -> Json<Vec<GsRoomListItem>> {
    let rooms = state.gs_list_rooms().await;
    
    let list: Vec<GsRoomListItem> = rooms
        .into_iter()
        .map(|room| GsRoomListItem {
            id: room.id,
            name: room.name,
            player_count: room.player_ids.len(),
            max_players: room.max_players,
            is_playing: room.battle.is_some(),
        })
        .collect();
    
    Json(list)
}

/// 获取单个房间详情
pub async fn gs_get_room(
    State(state): State<GsAppState>,
    Path(room_id): Path<String>,
) -> Result<Json<Value>, GsError> {
    let room = state.gs_get_room(&room_id).await
        .ok_or_else(|| GsError::GsRoomNotFound(room_id.clone()))?;
    
    Ok(Json(json!({
        "id": room.id,
        "name": room.name,
        "owner_id": room.owner_id,
        "player_ids": room.player_ids,
        "max_players": room.max_players,
        "is_playing": room.battle.is_some(),
    })))
}
