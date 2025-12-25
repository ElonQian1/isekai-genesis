//! WebSocket 处理
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};

use crate::gs_state::GsAppState;
use game_core::GcMcpCommand;

/// WebSocket 消息类型
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum GsWsMessage {
    // =========================================================================
    // 客户端 -> 服务器
    // =========================================================================
    
    /// 登录
    Login { player_id: String, name: String },
    
    /// 创建房间
    CreateRoom { name: String },
    
    /// 加入房间
    JoinRoom { room_id: String },
    
    /// 离开房间
    LeaveRoom,
    
    /// 准备
    Ready,
    
    /// 取消准备
    Unready,
    
    /// 开始游戏
    StartGame,
    
    /// 出牌
    PlayCard { card_id: String, target_id: Option<String> },
    
    /// 结束回合
    EndTurn,

    // =========================================================================
    // 服务器 -> 客户端
    // =========================================================================
    
    /// 登录成功
    LoginSuccess { player_id: String },
    
    /// 房间创建成功
    RoomCreated { room_id: String },
    
    /// 加入房间成功
    RoomJoined { room_id: String, players: Vec<RoomPlayerInfo> },
    
    /// 房间列表
    RoomList { rooms: Vec<RoomInfo> },
    
    /// 玩家加入通知
    PlayerJoined { player_id: String, name: String },
    
    /// 玩家离开通知
    PlayerLeft { player_id: String },
    
    /// 玩家准备状态变化
    PlayerReady { player_id: String, ready: bool },
    
    /// 游戏开始
    GameStarted { battle_state: String },
    
    /// 游戏状态更新
    GameState { battle_state: String },
    
    /// 回合开始
    TurnStart { player_id: String },
    
    /// 卡牌打出
    CardPlayed { player_id: String, card_id: String, result: String },
    
    /// 回合结束
    TurnEnded { player_id: String },
    
    /// 游戏结束
    GameEnded { winner_id: Option<String> },
    
    /// 错误
    Error { code: String, message: String },
    
    /// 心跳
    Ping,
    Pong,

    /// MCP 命令 (服务器 -> 客户端)
    McpCommand { command: GcMcpCommand },
}

/// 房间信息 (用于列表)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RoomInfo {
    pub id: String,
    pub name: String,
    pub player_count: usize,
    pub max_players: usize,
    pub game_started: bool,
}

/// 房间内玩家信息
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RoomPlayerInfo {
    pub id: String,
    pub name: String,
    pub ready: bool,
    pub is_owner: bool,
}

/// WebSocket 升级处理
pub async fn gs_websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<GsAppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| gs_handle_socket(socket, state))
}

/// 处理单个 WebSocket 连接
async fn gs_handle_socket(socket: WebSocket, state: GsAppState) {
    let (mut sender, mut receiver) = socket.split();
    
    let mut player_id: Option<String> = None;
    let mut current_room_id: Option<String> = None;
    
    // 订阅广播
    let mut broadcast_rx = state.gs_subscribe();
    
    // 订阅 MCP
    let mut mcp_rx = if let Some(tx) = &state.mcp_tx {
        Some(tx.subscribe())
    } else {
        None
    };
    
    tracing::info!("新 WebSocket 连接");
    
    loop {
        tokio::select! {
            // 处理客户端消息
            result = receiver.next() => {
                let msg = match result {
                    Some(Ok(Message::Text(text))) => text,
                    Some(Ok(Message::Close(_))) | None => {
                        tracing::info!("WebSocket 关闭");
                        break;
                    }
                    Some(Err(e)) => {
                        tracing::error!("WebSocket 错误: {}", e);
                        break;
                    }
                    _ => continue,
                };
                
                // 解析消息
                let ws_msg: GsWsMessage = match serde_json::from_str(&msg) {
                    Ok(m) => m,
                    Err(e) => {
                        let error = GsWsMessage::Error {
                            code: "PARSE_ERROR".to_string(),
                            message: format!("消息解析失败: {}", e),
                        };
                        let _ = sender.send(Message::Text(serde_json::to_string(&error).unwrap().into())).await;
                        continue;
                    }
                };
                
                // 处理消息
                let responses = gs_handle_message(&state, &mut player_id, &mut current_room_id, ws_msg).await;
                
                // 发送响应
                for resp in responses {
                    let text = serde_json::to_string(&resp).unwrap();
                    if sender.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
            }
            
            // 处理广播消息
            broadcast_result = broadcast_rx.recv() => {
                if let Ok(broadcast) = broadcast_result {
                    // 检查是否在同一房间
                    if current_room_id.as_ref() == Some(&broadcast.room_id) {
                        // 检查是否被排除
                        let excluded = player_id.as_ref()
                            .map(|pid| broadcast.exclude_ids.contains(pid))
                            .unwrap_or(false);
                        
                        if !excluded {
                            if sender.send(Message::Text(broadcast.message.into())).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            }
            
            // 处理 MCP 消息
            mcp_result = async {
                if let Some(rx) = &mut mcp_rx {
                    rx.recv().await
                } else {
                    futures_util::future::pending().await
                }
            } => {
                if let Ok(cmd) = mcp_result {
                    // 转发给客户端
                    let msg = GsWsMessage::McpCommand { command: cmd };
                    let text = serde_json::to_string(&msg).unwrap();
                    if sender.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }
    
    // 断开连接时清理
    if let Some(pid) = player_id {
        state.gs_player_disconnect(&pid).await;
        tracing::info!("玩家 {} 断开连接", pid);
    }
}

/// 处理单个消息
async fn gs_handle_message(
    state: &GsAppState,
    player_id: &mut Option<String>,
    current_room_id: &mut Option<String>,
    msg: GsWsMessage,
) -> Vec<GsWsMessage> {
    match msg {
        GsWsMessage::Ping => vec![GsWsMessage::Pong],
        
        // =================================================================
        // 登录
        // =================================================================
        GsWsMessage::Login { player_id: pid, name } => {
            state.gs_player_connect(pid.clone(), name).await;
            *player_id = Some(pid.clone());
            tracing::info!("玩家登录: {}", pid);
            vec![GsWsMessage::LoginSuccess { player_id: pid }]
        }
        
        // =================================================================
        // 创建房间
        // =================================================================
        GsWsMessage::CreateRoom { name } => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            let room_id = state.gs_create_room(name, pid).await;
            *current_room_id = Some(room_id.clone());
            
            vec![GsWsMessage::RoomCreated { room_id }]
        }
        
        // =================================================================
        // 加入房间
        // =================================================================
        GsWsMessage::JoinRoom { room_id } => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            match state.gs_join_room(&room_id, pid.clone()).await {
                Ok(()) => {
                    *current_room_id = Some(room_id.clone());
                    
                    // 获取房间玩家信息
                    let players = if let Some(room) = state.gs_get_room(&room_id).await {
                        room.players.iter().map(|p| RoomPlayerInfo {
                            id: p.id.clone(),
                            name: p.name.clone(),
                            ready: p.ready,
                            is_owner: p.id == room.owner_id,
                        }).collect()
                    } else {
                        vec![]
                    };
                    
                    // 获取玩家名称
                    let player_name = state.players.read().await
                        .get(&pid)
                        .map(|p| p.name.clone())
                        .unwrap_or_else(|| pid.clone());
                    
                    // 广播给房间其他玩家
                    let broadcast_msg = GsWsMessage::PlayerJoined {
                        player_id: pid.clone(),
                        name: player_name,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&broadcast_msg).unwrap(),
                        vec![pid],
                    );
                    
                    vec![GsWsMessage::RoomJoined { room_id, players }]
                }
                Err(e) => vec![GsWsMessage::Error {
                    code: "JOIN_FAILED".to_string(),
                    message: e,
                }],
            }
        }
        
        // =================================================================
        // 离开房间
        // =================================================================
        GsWsMessage::LeaveRoom => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![],
            };
            
            if let Some(room_id) = current_room_id.take() {
                state.gs_leave_room(&room_id, &pid).await;
                
                // 广播给房间其他玩家
                let broadcast_msg = GsWsMessage::PlayerLeft {
                    player_id: pid.clone(),
                };
                state.gs_broadcast_to_room(
                    &room_id,
                    serde_json::to_string(&broadcast_msg).unwrap(),
                    vec![pid],
                );
            }
            
            vec![]
        }
        
        // =================================================================
        // 准备
        // =================================================================
        GsWsMessage::Ready => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            let room_id = match current_room_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_IN_ROOM".to_string(),
                    message: "请先加入房间".to_string(),
                }],
            };
            
            match state.gs_set_ready(&room_id, &pid, true).await {
                Ok(()) => {
                    // 广播给房间所有玩家
                    let broadcast_msg = GsWsMessage::PlayerReady {
                        player_id: pid,
                        ready: true,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&broadcast_msg).unwrap(),
                        vec![],
                    );
                    vec![]
                }
                Err(e) => vec![GsWsMessage::Error {
                    code: "READY_FAILED".to_string(),
                    message: e,
                }],
            }
        }
        
        // =================================================================
        // 取消准备
        // =================================================================
        GsWsMessage::Unready => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![],
            };
            
            let room_id = match current_room_id {
                Some(id) => id.clone(),
                None => return vec![],
            };
            
            if state.gs_set_ready(&room_id, &pid, false).await.is_ok() {
                let broadcast_msg = GsWsMessage::PlayerReady {
                    player_id: pid,
                    ready: false,
                };
                state.gs_broadcast_to_room(
                    &room_id,
                    serde_json::to_string(&broadcast_msg).unwrap(),
                    vec![],
                );
            }
            
            vec![]
        }
        
        // =================================================================
        // 开始游戏
        // =================================================================
        GsWsMessage::StartGame => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            let room_id = match current_room_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_IN_ROOM".to_string(),
                    message: "请先加入房间".to_string(),
                }],
            };
            
            match state.gs_start_game(&room_id, &pid).await {
                Ok(battle) => {
                    let battle_json = serde_json::to_string(&battle).unwrap();
                    
                    // 广播给房间所有玩家
                    let broadcast_msg = GsWsMessage::GameStarted {
                        battle_state: battle_json,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&broadcast_msg).unwrap(),
                        vec![],
                    );
                    
                    vec![]
                }
                Err(e) => vec![GsWsMessage::Error {
                    code: "START_FAILED".to_string(),
                    message: e,
                }],
            }
        }
        
        // =================================================================
        // 出牌
        // =================================================================
        GsWsMessage::PlayCard { card_id, target_id } => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            let room_id = match current_room_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_IN_ROOM".to_string(),
                    message: "请先加入房间".to_string(),
                }],
            };
            
            match state.gs_play_card(&room_id, &pid, &card_id, target_id.as_deref()).await {
                Ok((result, battle)) => {
                    let result_json = serde_json::to_string(&result).unwrap();
                    let battle_json = serde_json::to_string(&battle).unwrap();
                    
                    // 广播卡牌打出
                    let card_msg = GsWsMessage::CardPlayed {
                        player_id: pid.clone(),
                        card_id,
                        result: result_json,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&card_msg).unwrap(),
                        vec![],
                    );
                    
                    // 广播状态更新
                    let state_msg = GsWsMessage::GameState {
                        battle_state: battle_json,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&state_msg).unwrap(),
                        vec![],
                    );
                    
                    // 检查游戏是否结束
                    if battle.gc_is_finished() {
                        let end_msg = GsWsMessage::GameEnded {
                            winner_id: battle.winner_id,
                        };
                        state.gs_broadcast_to_room(
                            &room_id,
                            serde_json::to_string(&end_msg).unwrap(),
                            vec![],
                        );
                    }
                    
                    vec![]
                }
                Err(e) => vec![GsWsMessage::Error {
                    code: "PLAY_CARD_FAILED".to_string(),
                    message: e,
                }],
            }
        }
        
        // =================================================================
        // 结束回合
        // =================================================================
        GsWsMessage::EndTurn => {
            let pid = match player_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_LOGGED_IN".to_string(),
                    message: "请先登录".to_string(),
                }],
            };
            
            let room_id = match current_room_id {
                Some(id) => id.clone(),
                None => return vec![GsWsMessage::Error {
                    code: "NOT_IN_ROOM".to_string(),
                    message: "请先加入房间".to_string(),
                }],
            };
            
            match state.gs_end_turn(&room_id, &pid).await {
                Ok(battle) => {
                    // 广播回合结束
                    let turn_end_msg = GsWsMessage::TurnEnded {
                        player_id: pid,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&turn_end_msg).unwrap(),
                        vec![],
                    );
                    
                    // 广播状态更新
                    let battle_json = serde_json::to_string(&battle).unwrap();
                    let state_msg = GsWsMessage::GameState {
                        battle_state: battle_json,
                    };
                    state.gs_broadcast_to_room(
                        &room_id,
                        serde_json::to_string(&state_msg).unwrap(),
                        vec![],
                    );
                    
                    // 广播新回合开始
                    if let Some(next_player) = battle.gc_current_player_id() {
                        let turn_start_msg = GsWsMessage::TurnStart {
                            player_id: next_player.to_string(),
                        };
                        state.gs_broadcast_to_room(
                            &room_id,
                            serde_json::to_string(&turn_start_msg).unwrap(),
                            vec![],
                        );
                    }
                    
                    vec![]
                }
                Err(e) => vec![GsWsMessage::Error {
                    code: "END_TURN_FAILED".to_string(),
                    message: e,
                }],
            }
        }
        
        // 未处理的消息类型
        _ => vec![GsWsMessage::Error {
            code: "UNKNOWN_MESSAGE".to_string(),
            message: "未知的消息类型".to_string(),
        }],
    }
}
