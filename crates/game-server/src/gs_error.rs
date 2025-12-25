//! 服务器错误类型
//!
//! 模块: game-server
//! 前缀: Gs
//! 文档: 文档/03-game-server.md

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// 服务器错误类型
#[derive(Debug, Error)]
pub enum GsError {
    /// 房间不存在
    #[error("房间不存在: {0}")]
    GsRoomNotFound(String),
    
    /// 房间已满
    #[error("房间已满")]
    GsRoomFull,
    
    /// 玩家不存在
    #[error("玩家不存在: {0}")]
    GsPlayerNotFound(String),
    
    /// 认证失败
    #[error("认证失败: {0}")]
    GsAuthFailed(String),
    
    /// 数据库错误
    #[error("数据库错误: {0}")]
    GsDatabaseError(String),
    
    /// 内部错误
    #[error("内部错误: {0}")]
    GsInternalError(String),
    
    /// 内部错误 (简化别名)
    #[error("内部错误: {0}")]
    InternalError(String),
    
    /// 认证错误
    #[error("认证错误: {0}")]
    AuthError(String),
}

impl IntoResponse for GsError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            GsError::GsRoomNotFound(_) => (StatusCode::NOT_FOUND, "ROOM_NOT_FOUND", self.to_string()),
            GsError::GsRoomFull => (StatusCode::CONFLICT, "ROOM_FULL", self.to_string()),
            GsError::GsPlayerNotFound(_) => (StatusCode::NOT_FOUND, "PLAYER_NOT_FOUND", self.to_string()),
            GsError::GsAuthFailed(_) => (StatusCode::UNAUTHORIZED, "AUTH_FAILED", self.to_string()),
            GsError::GsDatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "DATABASE_ERROR", "数据库错误".to_string()),
            GsError::GsInternalError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "内部错误".to_string()),
            GsError::InternalError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", self.to_string()),
            GsError::AuthError(_) => (StatusCode::UNAUTHORIZED, "AUTH_ERROR", self.to_string()),
        };

        let body = json!({
            "error": {
                "code": code,
                "message": message,
            }
        });

        (status, Json(body)).into_response()
    }
}

// 从 sqlx 错误转换
impl From<sqlx::Error> for GsError {
    fn from(err: sqlx::Error) -> Self {
        GsError::GsDatabaseError(err.to_string())
    }
}

// 从 anyhow 错误转换
impl From<anyhow::Error> for GsError {
    fn from(err: anyhow::Error) -> Self {
        GsError::GsInternalError(err.to_string())
    }
}
