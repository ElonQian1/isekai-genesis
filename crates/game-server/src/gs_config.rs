//! 服务器配置
//!
//! 模块: game-server
//! 前缀: Gs
//! 文档: 文档/03-game-server.md

use serde::Deserialize;

/// 服务器配置
#[derive(Clone, Debug, Deserialize)]
pub struct GsConfig {
    /// 服务器端口
    pub port: u16,
    
    /// 数据库 URL
    pub database_url: String,
    
    /// JWT 密钥
    pub jwt_secret: String,
    
    /// 最大房间数
    pub max_rooms: usize,
    
    /// 每房间最大玩家数
    pub max_players_per_room: usize,
}

impl Default for GsConfig {
    fn default() -> Self {
        Self {
            port: 3000,
            database_url: "postgres://localhost/cardgame".to_string(),
            jwt_secret: "dev-secret-change-in-production".to_string(),
            max_rooms: 100,
            max_players_per_room: 4,
        }
    }
}

impl GsConfig {
    /// 从环境变量加载配置
    pub fn gs_from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://localhost/cardgame".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".to_string()),
            max_rooms: std::env::var("MAX_ROOMS")
                .ok()
                .and_then(|r| r.parse().ok())
                .unwrap_or(100),
            max_players_per_room: std::env::var("MAX_PLAYERS_PER_ROOM")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(4),
        }
    }
}
