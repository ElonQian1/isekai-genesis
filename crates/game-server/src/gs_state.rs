//! 应用状态管理
//!
//! 模块: game-server
//! 前缀: Gs
//! 文档: 文档/03-game-server.md

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use game_core::*;

use crate::gs_config::GsConfig;
use crate::gs_db::GsDatabase;

// =============================================================================
// 广播消息
// =============================================================================

/// 房间内广播消息
#[derive(Clone, Debug)]
pub struct GsBroadcastMessage {
    /// 房间 ID
    pub room_id: String,
    /// 消息内容 (JSON 字符串)
    pub message: String,
    /// 排除的玩家 ID (不发给这些玩家)
    pub exclude_ids: Vec<String>,
}

// =============================================================================
// 房间状态
// =============================================================================

/// 玩家在房间中的状态
#[derive(Clone, Debug, Default)]
pub struct GsRoomPlayer {
    /// 玩家 ID
    pub id: String,
    /// 玩家名称
    pub name: String,
    /// 是否准备
    pub ready: bool,
}

/// 房间状态
#[derive(Clone, Debug)]
pub struct GsRoom {
    /// 房间 ID
    pub id: String,
    /// 房间名称
    pub name: String,
    /// 房主 ID
    pub owner_id: String,
    /// 玩家列表 (带准备状态)
    pub players: Vec<GsRoomPlayer>,
    /// 战斗状态 (如果正在进行)
    pub battle: Option<GcBattleState>,
    /// 最大玩家数
    pub max_players: usize,
    /// 游戏是否已开始
    pub game_started: bool,
}

impl GsRoom {
    pub fn gs_new(id: String, name: String, owner_id: String, owner_name: String) -> Self {
        let owner = GsRoomPlayer {
            id: owner_id.clone(),
            name: owner_name,
            ready: false,
        };
        Self {
            id,
            name,
            owner_id,
            players: vec![owner],
            battle: None,
            max_players: 2,
            game_started: false,
        }
    }

    pub fn gs_is_full(&self) -> bool {
        self.players.len() >= self.max_players
    }

    pub fn gs_add_player(&mut self, player_id: String, player_name: String) -> bool {
        if self.gs_is_full() {
            return false;
        }
        if self.players.iter().any(|p| p.id == player_id) {
            return false;
        }
        self.players.push(GsRoomPlayer {
            id: player_id,
            name: player_name,
            ready: false,
        });
        true
    }

    pub fn gs_remove_player(&mut self, player_id: &str) {
        self.players.retain(|p| p.id != player_id);
    }
    
    /// 设置玩家准备状态
    pub fn gs_set_ready(&mut self, player_id: &str, ready: bool) -> bool {
        if let Some(player) = self.players.iter_mut().find(|p| p.id == player_id) {
            player.ready = ready;
            true
        } else {
            false
        }
    }
    
    /// 检查是否所有玩家都准备好了
    pub fn gs_all_ready(&self) -> bool {
        self.players.len() >= 2 && self.players.iter().all(|p| p.ready)
    }
    
    /// 获取玩家 ID 列表
    pub fn gs_player_ids(&self) -> Vec<String> {
        self.players.iter().map(|p| p.id.clone()).collect()
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

/// 内存用户存储（开发模式，无需数据库）
#[derive(Clone, Debug)]
pub struct GsMemoryUser {
    pub id: uuid::Uuid,
    pub username: String,
    pub password_hash: String,
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
    /// 广播发送器
    pub broadcast_tx: broadcast::Sender<GsBroadcastMessage>,
    /// MCP 命令发送器
    pub mcp_tx: Option<broadcast::Sender<GcMcpCommand>>,
    /// 数据库连接
    pub db: Option<GsDatabase>,
    /// 内存用户存储（开发模式）
    pub memory_users: Arc<RwLock<HashMap<String, GsMemoryUser>>>,
}

impl GsAppState {
    /// 创建新的应用状态
    pub async fn gs_new() -> anyhow::Result<Self> {
        let config = GsConfig::gs_from_env();
        let (broadcast_tx, _) = broadcast::channel(1024);
        let (mcp_tx, _) = broadcast::channel(1024);
        
        // 尝试连接数据库，如果失败则记录日志但不崩溃（允许无数据库运行）
        let db = match GsDatabase::gs_connect().await {
            Ok(db) => {
                tracing::info!("✅ 数据库连接成功");
                Some(db)
            },
            Err(e) => {
                tracing::warn!("⚠️ 数据库连接失败: {} - 将使用内存模式", e);
                tracing::info!("📝 内存模式: 用户数据仅在服务器运行期间保留");
                None
            }
        };
        
        Ok(Self {
            config,
            rooms: Arc::new(RwLock::new(HashMap::new())),
            players: Arc::new(RwLock::new(HashMap::new())),
            broadcast_tx,
            mcp_tx: Some(mcp_tx),
            db,
            memory_users: Arc::new(RwLock::new(HashMap::new())),
        })
    }
    
    /// 获取广播接收器
    pub fn gs_subscribe(&self) -> broadcast::Receiver<GsBroadcastMessage> {
        self.broadcast_tx.subscribe()
    }
    
    /// 广播消息到房间
    pub fn gs_broadcast_to_room(&self, room_id: &str, message: String, exclude_ids: Vec<String>) {
        let _ = self.broadcast_tx.send(GsBroadcastMessage {
            room_id: room_id.to_string(),
            message,
            exclude_ids,
        });
    }

    /// 创建房间
    pub async fn gs_create_room(&self, name: String, owner_id: String) -> String {
        let room_id = uuid::Uuid::new_v4().to_string();
        
        // 获取玩家名称
        let owner_name = self.players.read().await
            .get(&owner_id)
            .map(|p| p.name.clone())
            .unwrap_or_else(|| owner_id.clone());
        
        let room = GsRoom::gs_new(room_id.clone(), name, owner_id.clone(), owner_name);
        
        self.rooms.write().await.insert(room_id.clone(), room);
        
        // 更新玩家的房间 ID
        if let Some(player) = self.players.write().await.get_mut(&owner_id) {
            player.room_id = Some(room_id.clone());
        }
        
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
        // 获取玩家名称
        let player_name = self.players.read().await
            .get(&player_id)
            .map(|p| p.name.clone())
            .unwrap_or_else(|| player_id.clone());
        
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| format!("房间不存在: {}", room_id))?;
        
        if room.game_started {
            return Err("游戏已经开始".to_string());
        }
        
        if !room.gs_add_player(player_id.clone(), player_name) {
            return Err("房间已满".to_string());
        }
        
        drop(rooms);
        
        // 更新玩家的房间 ID
        if let Some(player) = self.players.write().await.get_mut(&player_id) {
            player.room_id = Some(room_id.to_string());
        }
        
        Ok(())
    }

    /// 离开房间
    pub async fn gs_leave_room(&self, room_id: &str, player_id: &str) {
        let mut rooms = self.rooms.write().await;
        
        if let Some(room) = rooms.get_mut(room_id) {
            room.gs_remove_player(player_id);
            
            // 如果房间空了，删除房间
            if room.players.is_empty() {
                rooms.remove(room_id);
                tracing::info!("房间已删除: {}", room_id);
            }
        }
        
        drop(rooms);
        
        // 清除玩家的房间 ID
        if let Some(player) = self.players.write().await.get_mut(player_id) {
            player.room_id = None;
        }
    }
    
    /// 设置玩家准备状态
    pub async fn gs_set_ready(&self, room_id: &str, player_id: &str, ready: bool) -> Result<(), String> {
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| "房间不存在".to_string())?;
        
        if room.game_started {
            return Err("游戏已经开始".to_string());
        }
        
        if !room.gs_set_ready(player_id, ready) {
            return Err("玩家不在房间中".to_string());
        }
        
        Ok(())
    }
    
    /// 开始游戏
    pub async fn gs_start_game(&self, room_id: &str, player_id: &str) -> Result<GcBattleState, String> {
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| "房间不存在".to_string())?;
        
        // 检查是否是房主
        if room.owner_id != player_id {
            return Err("只有房主可以开始游戏".to_string());
        }
        
        // 检查人数
        if room.players.len() < 2 {
            return Err("至少需要2名玩家".to_string());
        }
        
        // 检查是否所有人都准备好了 (房主自动准备)
        let all_ready = room.players.iter().all(|p| p.id == room.owner_id || p.ready);
        if !all_ready {
            return Err("还有玩家未准备".to_string());
        }
        
        // 创建战斗状态
        let gc_players: Vec<GcPlayer> = room.players.iter()
            .map(|p| GcPlayer::gc_new(&p.id, &p.name))
            .collect();
        
        let battle_id = format!("battle_{}", uuid::Uuid::new_v4());
        let mut battle = GcBattleState::gc_new(battle_id, gc_players);
        battle.phase = GcBattlePhase::Playing;
        
        room.battle = Some(battle.clone());
        room.game_started = true;
        
        tracing::info!("游戏开始: 房间 {}", room_id);
        
        Ok(battle)
    }
    
    /// 执行出牌
    pub async fn gs_play_card(
        &self, 
        room_id: &str, 
        player_id: &str, 
        card_id: &str,
        target_id: Option<&str>,
    ) -> Result<(GcPlayCardResult, GcBattleState), String> {
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| "房间不存在".to_string())?;
        
        let battle = room.battle.as_mut()
            .ok_or_else(|| "游戏未开始".to_string())?;
        
        // 默认目标是对手
        let actual_target = target_id.map(|s| s.to_string()).unwrap_or_else(|| {
            battle.players.iter()
                .find(|p| p.id != player_id && p.gc_can_act())
                .map(|p| p.id.clone())
                .unwrap_or_default()
        });
        
        let result = gc_execute_play_card(battle, player_id, card_id, &actual_target);
        
        Ok((result, battle.clone()))
    }
    
    /// 结束回合
    pub async fn gs_end_turn(&self, room_id: &str, player_id: &str) -> Result<GcBattleState, String> {
        let mut rooms = self.rooms.write().await;
        
        let room = rooms.get_mut(room_id)
            .ok_or_else(|| "房间不存在".to_string())?;
        
        let battle = room.battle.as_mut()
            .ok_or_else(|| "游戏未开始".to_string())?;
        
        // 检查是否轮到该玩家
        if battle.gc_current_player_id() != Some(player_id) {
            return Err("不是你的回合".to_string());
        }
        
        battle.gc_next_turn();
        
        // 先获取回合数
        let turn = battle.turn;
        
        // 给下一个玩家发牌
        if let Some(next_player) = battle.gc_current_player_mut() {
            // 简单的抽牌逻辑：给一张随机攻击牌
            let card = GcCard::gc_new_attack(
                &format!("card_{}", uuid::Uuid::new_v4()),
                "攻击",
                1,
                15 + (turn % 10),
            );
            next_player.hand.push(card);
            next_player.stats.energy = GcConfig::DEFAULT_ENERGY;
        }
        
        Ok(battle.clone())
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
