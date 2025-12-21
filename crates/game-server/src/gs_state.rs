//! 应用状态管理
//!
//! 模块: game-server
//! 前缀: Gs
//! 文档: 文档/03-game-server.md

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use game_core::*;

use crate::gs_config::GsConfig;

/// 房间状态
#[derive(Clone, Debug)]
pub struct GsRoom {
    /// 房间 ID
    pub id: String,
    /// 房间名称
    pub name: String,
    /// 房主 ID
    pub owner_id: String,
    /// 玩家列表
    pub player_ids: Vec<String>,
    /// 战斗状态 (如果正在进行)
    pub battle: Option<GcBattleState>,
    /// 最大玩家数
    pub max_players: usize,
}

impl GsRoom {
    pub fn gs_new(id: String, name: String, owner_id: String) -> Self {
        Self {
            id,
            name,
            owner_id: owner_id.clone(),
            player_ids: vec![owner_id],
            battle: None,
            max_players: 2,
        }
    }

    pub fn gs_is_full(&self) -> bool {
        self.player_ids.len() >= self.max_players
    }

    pub fn gs_add_player(&mut self, player_id: String) -> bool {
        if self.gs_is_full() {
            return false;
        }
        if !self.player_ids.contains(&player_id) {
            self.player_ids.push(player_id);
        }
        true
    }

    pub fn gs_remove_player(&mut self, player_id: &str) {
        self.player_ids.retain(|id| id != player_id);
    }
}

/// 连接的玩家信息
#[derive(Clone, Debug)]
pub struct GsConnectedPlayer {
    /// 玩家 ID
    pub id: String,
    /// 玩家名称
    pub name: String,
    /// 当前房间 ID
    pub room_id: Option<String>,
}

/// 应用共享状态
#[derive(Clone)]
pub struct GsAppState {
    /// 配置
    pub config: GsConfig,
    /// 房间列表
    pub rooms: Arc<RwLock<HashMap<String, GsRoom>>>,
    /// 已连接玩家
    pub players: Arc<RwLock<HashMap<String, GsConnectedPlayer>>>,
}

impl GsAppState {
    /// 创建新的应用状态
    pub async fn gs_new() -> anyhow::Result<Self> {
        let config = GsConfig::gs_from_env();
        
        Ok(Self {
            config,
            rooms: Arc::new(RwLock::new(HashMap::new())),
            players: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// 创建房间
    pub async fn gs_create_room(&self, name: String, owner_id: String) -> String {
        let room_id = uuid::Uuid::new_v4().to_string();
        let room = GsRoom::gs_new(room_id.clone(), name, owner_id);
        
        self.rooms.write().await.insert(room_id.clone(), room);
        
        tracing::info!("创建房间: {}", room_id);
        room_id
    }

    /// 获取房间
    pub async fn gs_get_room(&self, room_id: &str) -> Option<GsRoom> {
        self.rooms.read().await.get(room_id).cloned()
    }

    /// 获取所有房间
    pub async fn gs_list_rooms(&self) -> Vec<GsRoom> {
        self.rooms.read().await.values().cloned().collect()
    }

    /// 加入房间
    pub async fn gs_join_room(&self, room_id: &str, player_id: String) -> Result<(), String> {
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| format!("房间不存在: {}", room_id))?;
        
        if !room.gs_add_player(player_id) {
            return Err("房间已满".to_string());
        }
        
        Ok(())
    }

    /// 离开房间
    pub async fn gs_leave_room(&self, room_id: &str, player_id: &str) {
        let mut rooms = self.rooms.write().await;
        
        if let Some(room) = rooms.get_mut(room_id) {
            room.gs_remove_player(player_id);
            
            // 如果房间空了，删除房间
            if room.player_ids.is_empty() {
                rooms.remove(room_id);
                tracing::info!("房间已删除: {}", room_id);
            }
        }
    }

    /// 注册玩家连接
    pub async fn gs_player_connect(&self, id: String, name: String) {
        let player = GsConnectedPlayer {
            id: id.clone(),
            name,
            room_id: None,
        };
        
        self.players.write().await.insert(id, player);
    }

    /// 注销玩家连接
    pub async fn gs_player_disconnect(&self, player_id: &str) {
        // 先离开房间
        let player = self.players.read().await.get(player_id).cloned();
        if let Some(p) = player {
            if let Some(room_id) = p.room_id {
                self.gs_leave_room(&room_id, player_id).await;
            }
        }
        
        // 移除玩家
        self.players.write().await.remove(player_id);
    }
}
