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
mod gs_db;
mod gs_mcp;
mod gs_auth;

use axum::{routing::{get, post}, Router};
use std::net::SocketAddr;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Layer};

use gs_routes::*;
use gs_state::GsAppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 加载环境变量
    dotenvy::dotenv().ok();
    
    // 初始化日志 - 同时输出到控制台和文件
    // 从环境变量读取日志目录，默认为 "logs" (生产环境友好)
    let log_dir_str = std::env::var("LOG_DIR").unwrap_or_else(|_| "logs".to_string());
    let log_dir = std::path::Path::new(&log_dir_str);
    if !log_dir.exists() {
        std::fs::create_dir_all(log_dir)?;
    }
    
    // 开发模式：每次启动时清空旧日志 (可通过 CLEAR_LOGS=false 禁用)
    let clear_logs = std::env::var("CLEAR_LOGS").map(|v| v != "false").unwrap_or(true);
    let server_log = log_dir.join("server.log");
    let client_log = log_dir.join("client.log");
    if clear_logs {
        if server_log.exists() {
            let _ = std::fs::write(&server_log, "");
        }
        if client_log.exists() {
            let _ = std::fs::write(&client_log, "");
        }
    }
    
    // 文件日志 appender (非阻塞)
    let file_appender = tracing_appender::rolling::never(&log_dir_str, "server.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    
    // 环境过滤器
    let env_filter = tracing_subscriber::EnvFilter::new(
        std::env::var("RUST_LOG").unwrap_or_else(|_| "info,game_server=debug".into()),
    );
    
    // 控制台层
    let console_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_filter(env_filter.clone());
    
    // 文件层
    let file_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false)  // 文件不需要 ANSI 颜色码
        .with_writer(non_blocking)
        .with_filter(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,game_server=debug".into()),
        ));
    
    tracing_subscriber::registry()
        .with(console_layer)
        .with(file_layer)
        .init();

    tracing::info!("🚀 启动游戏服务器...");
    tracing::info!("📝 日志目录: {}", log_dir_str);

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
        .route("/api/upload", post(gs_upload_file))
        .route("/api/maps", post(gs_save_map)) // 新增保存地图接口
        .route("/api/assets", get(gs_list_assets)) // 新增资源列表接口
        
        // 认证 API
        .route("/api/auth/register", post(gs_register))
        .route("/api/auth/login", post(gs_login))
        .route("/api/auth/me", get(gs_get_current_user))
        
        // 玩家数据 API
        .route("/api/player/:id/inventory", get(gs_get_inventory).post(gs_save_inventory))
        .route("/api/player/:id/profession", get(gs_get_profession).post(gs_save_profession))
        .route("/api/player/:id/progress", get(gs_get_player_progress).post(gs_save_player_progress))
        
        // 日志接口 (供 AI 代理使用)
        .route("/api/logs/client", post(gs_save_client_logs))
        .route("/api/logs/client/view", get(gs_get_client_logs))
        .route("/api/logs/client/clear", post(gs_clear_client_logs))
        
        // WebSocket
        .route("/ws", get(gs_websocket::gs_websocket_handler))
        
        // MCP 路由
        .nest("/mcp", crate::gs_mcp::gs_mcp_routes(state.clone()))

        // 中间件
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        
        // 共享状态
        .with_state(state)
}
