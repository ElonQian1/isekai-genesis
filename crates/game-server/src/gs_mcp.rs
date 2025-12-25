//! MCP (Model Context Protocol) 服务器实现
//!
//! 模块: game-server
//! 前缀: gs_
//! 文档: 文档/12-MCP-API.md
//!
//! 实现 MCP over SSE 协议，允许 AI 代理控制游戏世界

use axum::{
    extract::State,
    response::{sse::{Event, Sse}, IntoResponse},
    routing::{get, post},
    Json, Router,
};
use futures_util::stream::{self, Stream};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{convert::Infallible, time::Duration, path::PathBuf};
use tokio_stream::StreamExt as _;
use tokio::fs;
use tracing::info;

use crate::gs_state::GsAppState;
use game_core::{GcMcpCommand, GcPosition};

// =============================================================================
// 数据结构
// =============================================================================

/// MCP JSON-RPC 请求
#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: Option<Value>,
    id: Option<Value>,
}

/// MCP JSON-RPC 响应
#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    result: Option<Value>,
    error: Option<JsonRpcError>,
    id: Option<Value>,
}

#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
    data: Option<Value>,
}

// =============================================================================
// 路由处理
// =============================================================================

/// 创建 MCP 路由
pub fn gs_mcp_routes(state: GsAppState) -> Router<GsAppState> {
    Router::new()
        .route("/sse", get(gs_mcp_sse_handler))
        .route("/message", post(gs_mcp_message_handler))
}

/// SSE 连接处理
async fn gs_mcp_sse_handler(
    State(state): State<GsAppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    info!("🤖 AI Agent connected to MCP SSE");
    
    // 创建一个流，发送初始连接消息
    let initial_stream = stream::once(async {
        Ok(Event::default()
            .event("endpoint")
            .data("/mcp/message"))
    });

    // 这里可以添加更多来自服务器的事件流
    // 目前我们只保持连接活跃
    let keep_alive_stream = stream::repeat_with(|| {
        Event::default().comment("keep-alive")
    })
    .map(Ok)
    .throttle(Duration::from_secs(15));

    Sse::new(initial_stream.chain(keep_alive_stream))
        .keep_alive(axum::response::sse::KeepAlive::new())
}

/// MCP 消息处理 (JSON-RPC)
async fn gs_mcp_message_handler(
    State(state): State<GsAppState>,
    Json(request): Json<JsonRpcRequest>,
) -> Json<JsonRpcResponse> {
    info!("📩 Received MCP request: {:?}", request.method);

    let response = match request.method.as_str() {
        "tools/list" => gs_handle_list_tools(request.id),
        "tools/call" => gs_handle_call_tool(state, request.params, request.id).await,
        _ => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            result: None,
            error: Some(JsonRpcError {
                code: -32601,
                message: "Method not found".to_string(),
                data: None,
            }),
            id: request.id,
        },
    };

    Json(response)
}

// =============================================================================
// 工具实现
// =============================================================================

/// 列出可用工具
fn gs_handle_list_tools(id: Option<Value>) -> JsonRpcResponse {
    let tools = json!({
        "tools": [
            {
                "name": "spawn_entity",
                "description": "在指定位置生成一个实体（树木、建筑、敌人等）",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "entity_type": { "type": "string", "enum": ["tree", "rock", "building", "enemy", "npc"] },
                        "prefab_id": { "type": "string", "description": "预制体ID，如 Pine_Tree_1, Rock_Moss_1" },
                        "x": { "type": "number" },
                        "y": { "type": "number" },
                        "z": { "type": "number", "description": "通常为0，除非在空中" },
                        "rotation": { "type": "number", "default": 0 },
                        "scale": { "type": "number", "default": 1 }
                    },
                    "required": ["entity_type", "prefab_id", "x", "y"]
                }
            },
            {
                "name": "delete_entity",
                "description": "删除指定ID的实体",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "entity_id": { "type": "string" }
                    },
                    "required": ["entity_id"]
                }
            },
            {
                "name": "clear_area",
                "description": "清空指定区域内的所有物体",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "x": { "type": "number" },
                        "y": { "type": "number" },
                        "radius": { "type": "number" }
                    },
                    "required": ["x", "y", "radius"]
                }
            },
            {
                "name": "undo",
                "description": "撤销上一次操作",
                "inputSchema": { "type": "object", "properties": {} }
            },
            {
                "name": "list_prefabs",
                "description": "获取所有可用的预制体素材列表，包含分类、ID、名称。AI 在生成实体前应先调用此工具了解可用素材。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "category": { "type": "string", "description": "可选，筛选分类：trees, bushes, plants, flowers, grass, rocks, paths, mushrooms" }
                    }
                }
            },
            {
                "name": "spawn_batch",
                "description": "批量生成多个实体，适合创建森林、花园等区域",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "entity_type": { "type": "string", "enum": ["tree", "rock", "plant", "flower", "grass"] },
                        "prefab_ids": { "type": "array", "items": { "type": "string" }, "description": "预制体ID列表，随机选择" },
                        "center_x": { "type": "number" },
                        "center_y": { "type": "number" },
                        "radius": { "type": "number", "description": "生成区域半径" },
                        "count": { "type": "integer", "description": "生成数量" }
                    },
                    "required": ["entity_type", "prefab_ids", "center_x", "center_y", "radius", "count"]
                }
            },
            {
                "name": "get_world_info",
                "description": "获取当前世界的基本信息，包括地图边界、可用预制体类型等",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "move_entity",
                "description": "移动指定实体到新位置",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "entity_id": { "type": "string", "description": "实体ID" },
                        "x": { "type": "number", "description": "新X坐标" },
                        "y": { "type": "number", "description": "新Y坐标（地面高度为0）" }
                    },
                    "required": ["entity_id", "x", "y"]
                }
            }
        ]
    });

    JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        result: Some(tools),
        error: None,
        id,
    }
}

/// 调用工具
async fn gs_handle_call_tool(
    state: GsAppState,
    params: Option<Value>,
    id: Option<Value>,
) -> JsonRpcResponse {
    let params = match params {
        Some(p) => p,
        None => return JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            result: None,
            error: Some(JsonRpcError { code: -32602, message: "Invalid params".to_string(), data: None }),
            id,
        },
    };

    let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
    let args = params.get("arguments").cloned().unwrap_or(json!({}));

    info!("🛠️ Calling tool: {} with args: {:?}", name, args);

    // 构造游戏命令
    let command = match name {
        "spawn_entity" => {
            let x = args.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            let y = args.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            
            Some(GcMcpCommand::SpawnEntity {
                entity_type: args.get("entity_type").and_then(|v| v.as_str()).unwrap_or("tree").to_string(),
                prefab_id: args.get("prefab_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                position: GcPosition { x, y },
                rotation: args.get("rotation").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32,
                scale: args.get("scale").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32,
            })
        },
        "delete_entity" => {
            Some(GcMcpCommand::DeleteEntity {
                entity_id: args.get("entity_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            })
        },
        "clear_area" => {
            let x = args.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            let y = args.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            Some(GcMcpCommand::ClearArea {
                center: GcPosition { x, y },
                radius: args.get("radius").and_then(|v| v.as_f64()).unwrap_or(10.0) as f32,
            })
        },
        "undo" => Some(GcMcpCommand::Undo),
        "spawn_batch" => {
            let center_x = args.get("center_x").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            let center_y = args.get("center_y").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            let prefab_ids: Vec<String> = args.get("prefab_ids")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();
            
            Some(GcMcpCommand::SpawnBatch {
                entity_type: args.get("entity_type").and_then(|v| v.as_str()).unwrap_or("tree").to_string(),
                prefab_ids,
                center: GcPosition { x: center_x, y: center_y },
                radius: args.get("radius").and_then(|v| v.as_f64()).unwrap_or(10.0) as f32,
                count: args.get("count").and_then(|v| v.as_u64()).unwrap_or(5) as u32,
            })
        },
        "list_prefabs" => {
            // 直接返回预制体列表，不需要发送到客户端
            let category = args.get("category").and_then(|v| v.as_str());
            let prefabs = gs_get_prefabs_list(category).await;
            return JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!({ "content": [{ "type": "text", "text": prefabs }] })),
                error: None,
                id,
            };
        },
        "get_world_info" => {
            // 返回世界基本信息
            let world_info = gs_get_world_info().await;
            return JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!({ "content": [{ "type": "text", "text": world_info }] })),
                error: None,
                id,
            };
        },
        "move_entity" => {
            let x = args.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            let y = args.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0) as i32;
            Some(GcMcpCommand::MoveEntity {
                entity_id: args.get("entity_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                position: GcPosition { x, y },
            })
        },
        _ => None,
    };

    if let Some(cmd) = command {
        // 广播命令给所有连接的客户端
        // 注意：这里我们需要访问 WebSocket 的广播通道
        // 由于 GsAppState 中没有直接暴露 sender，我们需要在 gs_state.rs 中添加或通过其他方式获取
        // 暂时假设 state.broadcast_tx 存在 (需要修改 GsAppState)
        
        if let Some(tx) = &state.mcp_tx {
             let _ = tx.send(cmd);
             JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: Some(json!({ "content": [{ "type": "text", "text": "Command executed successfully" }] })),
                error: None,
                id,
            }
        } else {
             JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                result: None,
                error: Some(JsonRpcError { code: -32603, message: "Internal error: MCP channel not available".to_string(), data: None }),
                id,
            }
        }
    } else {
        JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            result: None,
            error: Some(JsonRpcError { code: -32601, message: "Tool not found or invalid arguments".to_string(), data: None }),
            id,
        }
    }
}

// =============================================================================
// 素材查询
// =============================================================================

/// 预制体分类数据结构
#[derive(Debug, Serialize, Deserialize)]
struct PrefabCategory {
    name: String,
    models: Vec<PrefabModel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PrefabModel {
    id: String,
    file: String,
    name: String,
    scale: f32,
}

#[derive(Debug, Serialize, Deserialize)]
struct PrefabsData {
    version: String,
    description: String,
    license: String,
    categories: std::collections::HashMap<String, PrefabCategory>,
}

/// 获取预制体列表
async fn gs_get_prefabs_list(category_filter: Option<&str>) -> String {
    // 尝试读取 nature_prefabs.json
    let prefabs_path = PathBuf::from("../client/public/assets/data/nature_prefabs.json");
    
    match fs::read_to_string(&prefabs_path).await {
        Ok(content) => {
            match serde_json::from_str::<PrefabsData>(&content) {
                Ok(data) => {
                    let mut result = String::new();
                    result.push_str("# 可用预制体素材列表\n\n");
                    
                    for (cat_id, category) in &data.categories {
                        // 如果有分类过滤器，只返回匹配的分类
                        if let Some(filter) = category_filter {
                            if cat_id != filter {
                                continue;
                            }
                        }
                        
                        result.push_str(&format!("## {} ({})\n", category.name, cat_id));
                        for model in &category.models {
                            result.push_str(&format!("- `{}`: {} (文件: {})\n", model.id, model.name, model.file));
                        }
                        result.push('\n');
                    }
                    
                    result.push_str("\n## 使用说明\n");
                    result.push_str("调用 `spawn_entity` 时，使用上述 `id` 作为 `prefab_id` 参数。\n");
                    result.push_str("例如: `spawn_entity(entity_type=\"tree\", prefab_id=\"pine_1\", x=10, y=20)`\n");
                    
                    result
                },
                Err(e) => format!("解析预制体配置失败: {}", e),
            }
        },
        Err(e) => {
            // 如果文件不存在，返回内置的基础列表
            info!("预制体配置文件未找到 ({}), 使用内置列表", e);
            r#"# 可用预制体素材列表 (内置)

## 树木 (trees)
- `pine_1` ~ `pine_5`: 松树
- `common_tree_1` ~ `common_tree_5`: 普通树
- `dead_tree_1` ~ `dead_tree_5`: 枯树
- `twisted_tree_1` ~ `twisted_tree_5`: 扭曲树

## 灌木 (bushes)
- `bush_common`: 普通灌木
- `bush_flowers`: 花灌木

## 岩石 (rocks)
- `rock_medium_1` ~ `rock_medium_3`: 中型岩石
- `pebble_round_1` ~ `pebble_round_5`: 圆卵石

## 植物 (plants)
- `fern_1`: 蕨类
- `clover_1`, `clover_2`: 三叶草

## 花朵 (flowers)
- `flower_3_group`, `flower_4_group`: 花群
- `petal_1` ~ `petal_5`: 花瓣

## 使用说明
调用 `spawn_entity` 时，使用上述 ID 作为 `prefab_id` 参数。
"#.to_string()
        }
    }
}

/// 获取世界基本信息
async fn gs_get_world_info() -> String {
    r#"# 游戏世界信息

## 地图边界
- **X轴范围**: -100 到 +100 (中心为玩家出生点)
- **Y轴范围**: -100 到 +100 (地面高度为0)
- **可建造区域**: 中心100x100范围内

## 坐标系统
- 使用2D坐标 (x, y)，y代表前后方向
- x: 左负右正
- y: 后负前正
- 高度由地形自动决定

## 实体密度建议
- **树木**: 每10单位距离约1-2棵
- **岩石**: 分散放置，避免密集
- **植物/花朵**: 可密集放置形成花坛

## 常用布局模式

### 森林区域
1. 先使用 `spawn_batch` 批量生成树木基底
2. 再添加灌木和植物点缀
3. 最后添加岩石和花朵细节

### 花园区域
1. 中心放置特色树木
2. 周围环绕花朵群
3. 边缘放置灌木作为边界

### 道路/空地
1. 使用 `clear_area` 清理区域
2. 沿边缘放置岩石或植物装饰

## 工具使用技巧
- 使用 `list_prefabs` 查看所有可用素材
- 使用 `spawn_batch` 快速生成区域
- 使用 `undo` 撤销错误操作
- 使用 `move_entity` 微调位置
"#.to_string()
}
