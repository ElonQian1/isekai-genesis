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
use game_core::*;

use crate::gs_state::GsAppState;

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
    RoomJoined { room_id: String },
    
    /// 玩家加入通知
    PlayerJoined { player_id: String, name: String },
    
    /// 玩家离开通知
    PlayerLeft { player_id: String },
    
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
    
    tracing::info!("新 WebSocket 连接");
    
    while let Some(result) = receiver.next().await {
        let msg = match result {
            Ok(Message::Text(text)) => text,
            Ok(Message::Close(_)) => {
                tracing::info!("WebSocket 关闭");
                break;
            }
            Err(e) => {
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
        let response = gs_handle_message(&state, &mut player_id, ws_msg).await;
        
        // 发送响应
        if let Some(resp) = response {
            let text = serde_json::to_string(&resp).unwrap();
            if sender.send(Message::Text(text.into())).await.is_err() {
                break;
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
    msg: GsWsMessage,
) -> Option<GsWsMessage> {
    match msg {
        GsWsMessage::Ping => Some(GsWsMessage::Pong),
        
        GsWsMessage::Login { player_id: pid, name } => {
            state.gs_player_connect(pid.clone(), name).await;
            *player_id = Some(pid.clone());
            tracing::info!("玩家登录: {}", pid);
            Some(GsWsMessage::LoginSuccess { player_id: pid })
        }
        
        GsWsMessage::CreateRoom { name } => {
            let pid = player_id.as_ref()?;
            let room_id = state.gs_create_room(name, pid.clone()).await;
            Some(GsWsMessage::RoomCreated { room_id })
        }
        
        GsWsMessage::JoinRoom { room_id } => {
            let pid = player_id.as_ref()?;
            match state.gs_join_room(&room_id, pid.clone()).await {
                Ok(()) => Some(GsWsMessage::RoomJoined { room_id }),
                Err(e) => Some(GsWsMessage::Error {
                    code: "JOIN_FAILED".to_string(),
                    message: e,
                }),
            }
        }
        
        GsWsMessage::LeaveRoom => {
            // TODO: 实现离开房间逻辑
            None
        }
        
        // TODO: 实现更多消息处理
        _ => {
            Some(GsWsMessage::Error {
                code: "NOT_IMPLEMENTED".to_string(),
                message: "功能尚未实现".to_string(),
            })
        }
    }
}
