//! HTTP 路由处理
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

use axum::{
    extract::{Path, State, Multipart},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use std::fs::OpenOptions;
use std::io::Write;
use uuid::Uuid;

use crate::gs_error::GsError;
use crate::gs_state::{GsAppState, GsMemoryUser};
use crate::gs_auth;
use game_core::{GcInventory, GcProfessionType};

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

// =============================================================================
// 认证 API
// =============================================================================

#[derive(Deserialize)]
pub struct GsAuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct GsAuthResponse {
    pub token: String,
    pub user_id: String,
    pub username: String,
}

/// 用户注册
pub async fn gs_register(
    State(state): State<GsAppState>,
    Json(payload): Json<GsAuthRequest>,
) -> Result<Json<GsAuthResponse>, GsError> {
    // 优先使用数据库
    if let Some(db) = &state.db {
        let user_id = db.gs_create_user(&payload.username, &payload.password).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
            
        let token = gs_auth::gs_create_token(user_id, &payload.username)?;
        
        Ok(Json(GsAuthResponse {
            token,
            user_id: user_id.to_string(),
            username: payload.username,
        }))
    } else {
        // 内存模式（开发用）
        let mut users = state.memory_users.write().await;
        
        // 检查用户名是否已存在
        if users.contains_key(&payload.username) {
            return Err(GsError::GsAuthFailed("用户名已存在".to_string()));
        }
        
        let user_id = Uuid::new_v4();
        // 简单哈希（开发模式，生产环境应使用 argon2）
        let password_hash = format!("dev_hash_{}", payload.password);
        
        users.insert(payload.username.clone(), GsMemoryUser {
            id: user_id,
            username: payload.username.clone(),
            password_hash,
        });
        
        tracing::info!("📝 [内存模式] 用户注册成功: {}", payload.username);
        
        let token = gs_auth::gs_create_token(user_id, &payload.username)?;
        
        Ok(Json(GsAuthResponse {
            token,
            user_id: user_id.to_string(),
            username: payload.username,
        }))
    }
}

/// 用户登录
pub async fn gs_login(
    State(state): State<GsAppState>,
    Json(payload): Json<GsAuthRequest>,
) -> Result<Json<GsAuthResponse>, GsError> {
    // 优先使用数据库
    if let Some(db) = &state.db {
        let user_id = db.gs_verify_user(&payload.username, &payload.password).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?
            .ok_or(GsError::GsAuthFailed("用户名或密码错误".to_string()))?;
            
        let token = gs_auth::gs_create_token(user_id, &payload.username)?;
        
        Ok(Json(GsAuthResponse {
            token,
            user_id: user_id.to_string(),
            username: payload.username,
        }))
    } else {
        // 内存模式（开发用）
        let users = state.memory_users.read().await;
        
        let user = users.get(&payload.username)
            .ok_or(GsError::GsAuthFailed("用户名或密码错误".to_string()))?;
        
        // 简单验证（开发模式）
        let expected_hash = format!("dev_hash_{}", payload.password);
        if user.password_hash != expected_hash {
            return Err(GsError::GsAuthFailed("用户名或密码错误".to_string()));
        }
        
        tracing::info!("📝 [内存模式] 用户登录成功: {}", payload.username);
        
        let token = gs_auth::gs_create_token(user.id, &payload.username)?;
        
        Ok(Json(GsAuthResponse {
            token,
            user_id: user.id.to_string(),
            username: payload.username,
        }))
    }
}

/// 获取当前用户信息 (需要认证)
pub async fn gs_get_current_user(
    headers: axum::http::HeaderMap,
) -> Result<Json<Value>, GsError> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(GsError::GsAuthFailed("Missing Authorization header".to_string()))?;
    
    if !auth_header.starts_with("Bearer ") {
        return Err(GsError::GsAuthFailed("Invalid Authorization format".to_string()));
    }
    
    let token = &auth_header[7..];
    let claims = gs_auth::gs_extract_user_from_token(token)?;
    
    Ok(Json(json!({
        "user_id": claims.sub,
        "username": claims.username,
    })))
}

// =============================================================================
// 玩家数据 API
// =============================================================================

/// 获取玩家背包
pub async fn gs_get_inventory(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
) -> Result<Json<Option<GcInventory>>, GsError> {
    if let Some(db) = &state.db {
        let inventory = db.gs_get_inventory(&player_id).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(inventory))
    } else {
        Ok(Json(None))
    }
}

/// 保存玩家背包
pub async fn gs_save_inventory(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
    Json(inventory): Json<GcInventory>,
) -> Result<Json<Value>, GsError> {
    if let Some(db) = &state.db {
        db.gs_save_inventory(&player_id, &inventory).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(json!({"status": "ok"})))
    } else {
        Err(GsError::GsInternalError("Database not connected".to_string()))
    }
}

/// 获取玩家职业
pub async fn gs_get_profession(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
) -> Result<Json<Option<GcProfessionType>>, GsError> {
    if let Some(db) = &state.db {
        let profession = db.gs_get_profession(&player_id).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(profession))
    } else {
        Ok(Json(None))
    }
}

/// 保存玩家职业
pub async fn gs_save_profession(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
    Json(profession): Json<GcProfessionType>,
) -> Result<Json<Value>, GsError> {
    if let Some(db) = &state.db {
        db.gs_save_profession(&player_id, profession).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(json!({"status": "ok"})))
    } else {
        Err(GsError::GsInternalError("Database not connected".to_string()))
    }
}

// =============================================================================
// 玩家进度 API
// =============================================================================

/// 玩家进度请求
#[derive(Deserialize)]
pub struct GsPlayerProgressRequest {
    pub world_position_x: f32,
    pub world_position_y: f32,
    pub world_position_z: f32,
    pub current_map: String,
    pub game_flags: serde_json::Value,
    pub statistics: serde_json::Value,
}

/// 获取玩家进度
pub async fn gs_get_player_progress(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
) -> Result<Json<Option<crate::gs_db::GsPlayerProgress>>, GsError> {
    if let Some(db) = &state.db {
        let progress = db.gs_get_player_progress(&player_id).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(progress))
    } else {
        Ok(Json(None))
    }
}

/// 保存玩家进度
pub async fn gs_save_player_progress(
    State(state): State<GsAppState>,
    Path(player_id): Path<String>,
    Json(req): Json<GsPlayerProgressRequest>,
) -> Result<Json<Value>, GsError> {
    if let Some(db) = &state.db {
        let progress = crate::gs_db::GsPlayerProgress {
            player_id: player_id.clone(),
            world_position_x: req.world_position_x,
            world_position_y: req.world_position_y,
            world_position_z: req.world_position_z,
            current_map: req.current_map,
            game_flags: req.game_flags,
            statistics: req.statistics,
        };
        
        db.gs_save_player_progress(&progress).await
            .map_err(|e| GsError::GsInternalError(e.to_string()))?;
        Ok(Json(json!({"status": "ok"})))
    } else {
        Err(GsError::GsInternalError("Database not connected".to_string()))
    }
}

/// 上传文件响应
#[derive(Serialize)]
pub struct GsUploadResponse {
    pub url: String,
    pub filename: String,
}

/// 处理文件上传
/// 
/// 接收 multipart/form-data，保存到 assets/uploads 目录
pub async fn gs_upload_file(
    mut multipart: Multipart,
) -> Result<Json<GsUploadResponse>, GsError> {
    // 确保上传目录存在
    // 注意：在生产环境中，这个路径应该配置化，并且指向 Nginx 服务的静态文件目录
    let upload_dir = PathBuf::from("../../client/public/assets/uploads");
    if !upload_dir.exists() {
        fs::create_dir_all(&upload_dir).await
            .map_err(|e| GsError::GsInternalError(format!("Failed to create upload dir: {}", e)))?;
    }

    while let Some(field) = multipart.next_field().await.map_err(|e| GsError::GsInternalError(e.to_string()))? {
        let name = field.name().unwrap_or("file").to_string();
        let file_name = field.file_name().unwrap_or("unnamed").to_string();
        
        // 简单的安全检查：只允许特定扩展名
        if !file_name.ends_with(".glb") && !file_name.ends_with(".gltf") && !file_name.ends_with(".png") && !file_name.ends_with(".jpg") {
             return Err(GsError::GsInternalError("Invalid file type. Only .glb, .gltf, .png, .jpg allowed.".to_string()));
        }

        let data = field.bytes().await.map_err(|e| GsError::GsInternalError(e.to_string()))?;

        // 生成唯一文件名以避免冲突 (这里简单使用原始文件名，实际应加 UUID)
        // 为了方便测试，我们暂时覆盖同名文件
        let file_path = upload_dir.join(&file_name);
        
        let mut file = fs::File::create(&file_path).await
            .map_err(|e| GsError::GsInternalError(format!("Failed to create file: {}", e)))?;
            
        file.write_all(&data).await
            .map_err(|e| GsError::GsInternalError(format!("Failed to write file: {}", e)))?;
            
        return Ok(Json(GsUploadResponse {
            url: format!("assets/uploads/{}", file_name),
            filename: file_name,
        }));
    }

    Err(GsError::GsInternalError("No file uploaded".to_string()))
}

/// 保存地图数据
pub async fn gs_save_map(
    Json(payload): Json<Value>,
) -> Result<Json<Value>, GsError> {
    // 确保目录存在
    let data_dir = PathBuf::from("../../client/public/assets/data");
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).await
            .map_err(|e| GsError::GsInternalError(format!("Failed to create data dir: {}", e)))?;
    }

    // 获取地图ID，默认为 map_default
    let map_id = payload.get("id").and_then(|v| v.as_str()).unwrap_or("map_default");
    let file_path = data_dir.join(format!("{}.json", map_id));

    // 写入文件
    let content = serde_json::to_string_pretty(&payload)
        .map_err(|e| GsError::GsInternalError(format!("Failed to serialize map data: {}", e)))?;
        
    let mut file = fs::File::create(&file_path).await
        .map_err(|e| GsError::GsInternalError(format!("Failed to create map file: {}", e)))?;
        
    file.write_all(content.as_bytes()).await
        .map_err(|e| GsError::GsInternalError(format!("Failed to write map file: {}", e)))?;

    Ok(Json(json!({
        "status": "ok",
        "message": format!("Map saved to {}", file_path.display())
    })))
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
            player_count: room.players.len(),
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
        "players": room.players.iter().map(|p| json!({
            "id": p.id,
            "name": p.name,
            "ready": p.ready
        })).collect::<Vec<_>>(),
        "max_players": room.max_players,
        "is_playing": room.battle.is_some(),
    })))
}

/// 资源列表项
#[derive(Serialize)]
pub struct GsAssetItem {
    pub name: String,
    pub type_: String, // "model", "texture"
    pub path: String,
}

/// 获取资源列表 (用于编辑器)
pub async fn gs_list_assets() -> Result<Json<Vec<GsAssetItem>>, GsError> {
    let mut assets = Vec::new();
    
    // 1. 扫描上传目录
    let upload_dir = PathBuf::from("../../assets/uploads");
    if upload_dir.exists() {
        let mut entries = fs::read_dir(upload_dir).await
            .map_err(|e| GsError::GsInternalError(format!("Failed to read uploads dir: {}", e)))?;
            
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ext_str == "glb" || ext_str == "gltf" {
                    if let Some(name) = path.file_name() {
                        assets.push(GsAssetItem {
                            name: name.to_string_lossy().to_string(),
                            type_: "model".to_string(),
                            path: format!("assets/uploads/{}", name.to_string_lossy()),
                        });
                    }
                }
            }
        }
    }
    
    // 2. 添加内置资源 - 使用 nature/ 目录下已有的模型
    assets.push(GsAssetItem {
        name: "tree_pine".to_string(),
        type_: "model".to_string(),
        path: "assets/models/nature/Pine_1.gltf".to_string(),
    });
    assets.push(GsAssetItem {
        name: "common_tree".to_string(),
        type_: "model".to_string(),
        path: "assets/models/nature/CommonTree_1.gltf".to_string(),
    });
    
    Ok(Json(assets))
}

// =============================================================================
// 日志相关接口
// =============================================================================

/// 前端日志条目
#[derive(Deserialize)]
pub struct GsLogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

/// 前端日志请求
#[derive(Deserialize)]
pub struct GsClientLogsRequest {
    pub logs: Vec<GsLogEntry>,
}

/// 获取日志保存目录 (从环境变量读取，默认为 "logs")
fn gs_get_log_dir() -> PathBuf {
    PathBuf::from(std::env::var("LOG_DIR").unwrap_or_else(|_| "logs".to_string()))
}

/// 保存前端日志
pub async fn gs_save_client_logs(
    Json(payload): Json<GsClientLogsRequest>,
) -> Result<Json<Value>, GsError> {
    let log_dir = gs_get_log_dir();
    
    // 确保目录存在
    if !log_dir.exists() {
        std::fs::create_dir_all(&log_dir)
            .map_err(|e| GsError::GsInternalError(format!("Failed to create log dir: {}", e)))?;
    }
    
    let log_file = log_dir.join("client.log");
    
    // 打开文件（追加模式）
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| GsError::GsInternalError(format!("Failed to open log file: {}", e)))?;
    
    // 写入日志
    for entry in &payload.logs {
        let line = format!(
            "[{}] [{}] {}\n",
            entry.timestamp,
            entry.level.to_uppercase(),
            entry.message
        );
        file.write_all(line.as_bytes())
            .map_err(|e| GsError::GsInternalError(format!("Failed to write log: {}", e)))?;
    }
    
    Ok(Json(json!({
        "status": "ok",
        "count": payload.logs.len()
    })))
}

/// 清空前端日志
pub async fn gs_clear_client_logs() -> Result<Json<Value>, GsError> {
    let log_file = gs_get_log_dir().join("client.log");
    
    if log_file.exists() {
        std::fs::write(&log_file, "")
            .map_err(|e| GsError::GsInternalError(format!("Failed to clear log: {}", e)))?;
    }
    
    Ok(Json(json!({
        "status": "ok",
        "message": "Client logs cleared"
    })))
}

/// 获取前端日志（用于 AI 代理查看）
pub async fn gs_get_client_logs() -> Result<String, GsError> {
    let log_file = gs_get_log_dir().join("client.log");
    
    if !log_file.exists() {
        return Ok("(日志文件为空)".to_string());
    }
    
    std::fs::read_to_string(&log_file)
        .map_err(|e| GsError::GsInternalError(format!("Failed to read log: {}", e)))
}
