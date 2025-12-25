//! 认证模块 (JWT)
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

use std::env;
use std::sync::LazyLock;
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, TokenData};
use chrono::{Utc, Duration};
use uuid::Uuid;
use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
    http::header::AUTHORIZATION,
};
use crate::gs_error::GsError;

/// JWT 密钥 (从环境变量读取，生产环境必须设置)
static JWT_SECRET: LazyLock<Vec<u8>> = LazyLock::new(|| {
    env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("⚠️ JWT_SECRET not set, using default (不安全，仅供开发使用)");
            "dev_secret_key_change_in_production".to_string()
        })
        .into_bytes()
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // Subject (User ID)
    pub username: String, // 用户名
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
}

/// 创建 JWT Token
pub fn gs_create_token(user_id: Uuid, username: &str) -> Result<String, GsError> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        iat: Utc::now().timestamp() as usize,
        exp: expiration as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(&JWT_SECRET),
    )
    .map_err(|e| GsError::GsInternalError(format!("Token creation failed: {}", e)))
}

/// 验证 JWT Token
pub fn gs_verify_token(token: &str) -> Result<TokenData<Claims>, GsError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(&JWT_SECRET),
        &Validation::default(),
    )
    .map_err(|_| GsError::GsAuthFailed("Invalid token".to_string()))
}

/// 从请求头提取用户信息 (用于需要认证的路由)
pub fn gs_extract_user_from_token(token: &str) -> Result<Claims, GsError> {
    let token_data = gs_verify_token(token)?;
    Ok(token_data.claims)
}

/// 认证中间件 - 验证 JWT Token
pub async fn gs_auth_middleware(
    request: Request,
    next: Next,
) -> Result<Response, GsError> {
    // 获取 Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok());

    match auth_header {
        Some(auth) if auth.starts_with("Bearer ") => {
            let token = &auth[7..]; // 去掉 "Bearer " 前缀
            
            // 验证 token
            gs_verify_token(token)?;
            
            // Token 有效，继续处理请求
            Ok(next.run(request).await)
        }
        _ => {
            Err(GsError::GsAuthFailed("Missing or invalid Authorization header".to_string()))
        }
    }
}
