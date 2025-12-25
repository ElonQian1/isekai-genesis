//! 数据库模块
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/03-game-server.md

use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::env;
use game_core::{GcInventory, GcProfessionType};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use uuid::Uuid;

/// 数据库连接池
#[derive(Clone)]
pub struct GsDatabase {
    pool: Pool<Postgres>,
}

impl GsDatabase {
    /// 连接数据库
    pub async fn gs_connect() -> anyhow::Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL 未设置，数据库功能不可用"))?;
            
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await?;
            
        // 运行迁移
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;
            
        Ok(Self { pool })
    }

    /// 创建新用户
    pub async fn gs_create_user(&self, username: &str, password: &str) -> anyhow::Result<Uuid> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Password hashing failed: {}", e))?
            .to_string();
        
        let row: (Uuid,) = sqlx::query_as(
            r#"
            INSERT INTO users (username, password_hash)
            VALUES ($1, $2)
            RETURNING id
            "#
        )
        .bind(username)
        .bind(password_hash)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(row.0)
    }

    /// 验证用户登录
    pub async fn gs_verify_user(&self, username: &str, password: &str) -> anyhow::Result<Option<Uuid>> {
        let row: Option<(String, Uuid)> = sqlx::query_as(
            "SELECT password_hash, id FROM users WHERE username = $1"
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;
        
        if let Some((hash, id)) = row {
            let parsed_hash = PasswordHash::new(&hash)
                .map_err(|e| anyhow::anyhow!("Password hash parsing failed: {}", e))?;
            if Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok() {
                return Ok(Some(id));
            }
        }
        
        Ok(None)
    }
    
    /// 获取玩家背包
    pub async fn gs_get_inventory(&self, player_id: &str) -> anyhow::Result<Option<GcInventory>> {
        let row: Option<(serde_json::Value,)> = sqlx::query_as(
            "SELECT inventory_data FROM player_inventories WHERE player_id = $1"
        )
        .bind(player_id)
        .fetch_optional(&self.pool)
        .await?;
        
        if let Some((data,)) = row {
            let inventory: GcInventory = serde_json::from_value(data)?;
            Ok(Some(inventory))
        } else {
            Ok(None)
        }
    }
    
    /// 保存玩家背包
    pub async fn gs_save_inventory(&self, player_id: &str, inventory: &GcInventory) -> anyhow::Result<()> {
        let data = serde_json::to_value(inventory)?;
        
        sqlx::query(
            r#"
            INSERT INTO player_inventories (player_id, inventory_data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (player_id) 
            DO UPDATE SET inventory_data = $2, updated_at = NOW()
            "#
        )
        .bind(player_id)
        .bind(data)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// 获取玩家职业
    pub async fn gs_get_profession(&self, player_id: &str) -> anyhow::Result<Option<GcProfessionType>> {
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT profession FROM player_profiles WHERE player_id = $1"
        )
        .bind(player_id)
        .fetch_optional(&self.pool)
        .await?;
        
        if let Some((prof_str,)) = row {
            // 简单的字符串转换，实际可能需要更健壮的转换
            let prof = match prof_str.as_str() {
                "Knight" => GcProfessionType::Knight,
                "Swordsman" => GcProfessionType::Swordsman,
                "Warlock" => GcProfessionType::Warlock,
                "Gunner" => GcProfessionType::Gunner,
                "Assassin" => GcProfessionType::Assassin,
                _ => return Ok(None),
            };
            Ok(Some(prof))
        } else {
            Ok(None)
        }
    }
    
    /// 保存玩家职业
    pub async fn gs_save_profession(&self, player_id: &str, profession: GcProfessionType) -> anyhow::Result<()> {
        let prof_str = match profession {
            GcProfessionType::Knight => "Knight",
            GcProfessionType::Swordsman => "Swordsman",
            GcProfessionType::Warlock => "Warlock",
            GcProfessionType::Gunner => "Gunner",
            GcProfessionType::Assassin => "Assassin",
        };
        
        sqlx::query(
            r#"
            INSERT INTO player_profiles (player_id, profession, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (player_id) 
            DO UPDATE SET profession = $2, updated_at = NOW()
            "#
        )
        .bind(player_id)
        .bind(prof_str)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    // =========================================================================
    // 玩家进度 API
    // =========================================================================
    
    /// 获取玩家进度
    pub async fn gs_get_player_progress(&self, player_id: &str) -> anyhow::Result<Option<GsPlayerProgress>> {
        let row: Option<GsPlayerProgress> = sqlx::query_as(
            r#"
            SELECT 
                player_id,
                world_position_x,
                world_position_y,
                world_position_z,
                current_map,
                game_flags,
                statistics
            FROM player_progress WHERE player_id = $1
            "#
        )
        .bind(player_id)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(row)
    }
    
    /// 保存玩家进度
    pub async fn gs_save_player_progress(&self, progress: &GsPlayerProgress) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            INSERT INTO player_progress (
                player_id, world_position_x, world_position_y, world_position_z,
                current_map, game_flags, statistics, last_save_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (player_id) 
            DO UPDATE SET 
                world_position_x = $2,
                world_position_y = $3,
                world_position_z = $4,
                current_map = $5,
                game_flags = $6,
                statistics = $7,
                last_save_at = NOW()
            "#
        )
        .bind(&progress.player_id)
        .bind(progress.world_position_x)
        .bind(progress.world_position_y)
        .bind(progress.world_position_z)
        .bind(&progress.current_map)
        .bind(&progress.game_flags)
        .bind(&progress.statistics)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
}

/// 玩家进度数据
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct GsPlayerProgress {
    pub player_id: String,
    pub world_position_x: f32,
    pub world_position_y: f32,
    pub world_position_z: f32,
    pub current_map: String,
    pub game_flags: serde_json::Value,
    pub statistics: serde_json::Value,
}
