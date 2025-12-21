//! 游戏服务器入口
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

mod gs_config;
mod gs_error;
mod gs_routes;
mod gs_state;
mod gs_websocket;

use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use gs_routes::*;
use gs_state::GsAppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 加载环境变量
    dotenvy::dotenv().ok();
    
    // 初始化日志
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,game_server=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 启动游戏服务器...");

    // 创建应用状态
    let state = GsAppState::gs_new().await?;
    
    // 构建路由
    let app = gs_create_router(state);

    // 绑定地址
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("🎮 服务器启动在 http://{}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// 创建路由器
fn gs_create_router(state: GsAppState) -> Router {
    Router::new()
        // 健康检查
        .route("/health", get(gs_health_check))
        
        // API 路由
        .route("/api/version", get(gs_version))
        .route("/api/rooms", get(gs_list_rooms))
        .route("/api/rooms/:id", get(gs_get_room))
        
        // WebSocket
        .route("/ws", get(gs_websocket::gs_websocket_handler))
        
        // 中间件
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        
        // 共享状态
        .with_state(state)
}
