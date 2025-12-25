//! MCP (Model Context Protocol) 协议定义
//!
//! 模块: game-core
//! 前缀: Gc
//! 文档: 文档/12-MCP-API.md
//!
//! 定义 AI 代理与游戏服务器交互的命令结构

use serde::{Deserialize, Serialize};
use crate::GcPosition;

/// MCP 操作命令
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum GcMcpCommand {
    /// 生成实体
    SpawnEntity {
        /// 实体类型 (tree, rock, building, enemy, npc)
        entity_type: String,
        /// 预制体 ID (例如: "Pine_Tree_1")
        prefab_id: String,
        /// 位置
        position: GcPosition,
        /// 旋转 (Y轴角度)
        rotation: f32,
        /// 缩放
        scale: f32,
    },
    
    /// 删除实体
    DeleteEntity {
        /// 实体 ID
        entity_id: String,
    },
    
    /// 移动实体
    MoveEntity {
        /// 实体 ID
        entity_id: String,
        /// 新位置
        position: GcPosition,
    },
    
    /// 批量生成 (例如: 生成一片森林)
    SpawnBatch {
        /// 实体类型
        entity_type: String,
        /// 预制体 ID 列表 (随机选择)
        prefab_ids: Vec<String>,
        /// 中心位置
        center: GcPosition,
        /// 半径
        radius: f32,
        /// 数量
        count: u32,
    },
    
    /// 清空区域
    ClearArea {
        /// 中心位置
        center: GcPosition,
        /// 半径
        radius: f32,
    },
    
    /// 撤销上一步操作
    Undo,
    
    /// 重做
    Redo,
}

/// MCP 响应
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcMcpResponse {
    /// 请求 ID
    pub request_id: String,
    /// 状态 (success, error)
    pub status: String,
    /// 消息
    pub message: Option<String>,
    /// 返回数据
    pub data: Option<serde_json::Value>,
}
