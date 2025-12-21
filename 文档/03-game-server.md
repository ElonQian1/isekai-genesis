# 🖥️ game-server 模块文档

> **模块前缀**: `gs_` | **语言**: Rust | **运行环境**: Native

---

## 📋 模块职责

```
game-server 是多人游戏后端服务器

✅ 可以做:
├── WebSocket 实时通信
├── HTTP API 端点
├── 房间管理
├── 数据库读写
├── 调用 game-core 进行游戏逻辑
└── 多人游戏状态同步

❌ 不可以做:
├── 实现游戏核心逻辑 (应在 game-core)
├── 渲染相关代码
└── 浏览器 API 调用
```

---

## 📁 文件结构

```
crates/game-server/
├── Cargo.toml
└── src/
    ├── main.rs             # 🚀 服务器入口
    ├── gs_app.rs           # 🌐 Axum 应用配置
    ├── gs_ws.rs            # 📡 WebSocket 处理
    ├── gs_room.rs          # 🏠 房间管理
    ├── gs_player.rs        # 👤 玩家会话
    ├── gs_battle.rs        # ⚔️ 战斗协调
    ├── gs_db.rs            # 🗄️ 数据库操作
    ├── gs_error.rs         # ❌ 错误类型
    └── gs_message.rs       # 📨 消息定义
```

---

## 🏷️ 命名规范

### 文件名
```
gs_xxx.rs    # 全部小写，gs_ 前缀
```

### 结构体
```rust
// ✅ 正确: Gs 前缀
pub struct GsRoomManager { ... }
pub struct GsPlayerSession { ... }
pub struct GsBattleCoordinator { ... }

// ❌ 错误: 无前缀
pub struct RoomManager { ... }  // 会混淆
```

### 函数
```rust
// ✅ 正确: gs_ 前缀
pub async fn gs_handle_connection(...) { ... }
pub async fn gs_create_room(...) { ... }
pub async fn gs_broadcast_to_room(...) { ... }
```

### 消息类型
```rust
// ✅ 正确: Gs 前缀 + Msg 后缀
pub enum GsClientMsg {
    GsJoinRoom { room_id: String },
    GsPlayCard { card_id: String, target_id: String },
    GsLeaveRoom,
}

pub enum GsServerMsg {
    GsRoomJoined { room: GsRoomInfo },
    GsBattleUpdate { state: GcBattleState },
    GsError { message: String },
}
```

---

## 📊 核心组件

### GsRoomManager - 房间管理器
```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct GsRoomManager {
    rooms: Arc<RwLock<HashMap<String, GsRoom>>>,
}

impl GsRoomManager {
    pub fn new() -> Self { ... }
    
    pub async fn gs_create_room(&self, host_id: &str) -> GsRoom { ... }
    
    pub async fn gs_join_room(&self, room_id: &str, player_id: &str) -> Result<(), GsError> { ... }
    
    pub async fn gs_leave_room(&self, room_id: &str, player_id: &str) { ... }
    
    pub async fn gs_get_room(&self, room_id: &str) -> Option<GsRoom> { ... }
}
```

### GsPlayerSession - 玩家会话
```rust
pub struct GsPlayerSession {
    pub id: String,
    pub username: String,
    pub room_id: Option<String>,
    pub tx: mpsc::Sender<GsServerMsg>,
}
```

### GsBattleCoordinator - 战斗协调器
```rust
use game_core::*;

pub struct GsBattleCoordinator {
    battle_state: GcBattleState,
    players: HashMap<String, mpsc::Sender<GsServerMsg>>,
}

impl GsBattleCoordinator {
    /// 处理玩家出牌
    pub async fn gs_handle_play_card(
        &mut self,
        player_id: &str,
        card_id: &str,
        target_id: &str,
    ) -> Result<(), GsError> {
        // 1. 调用 game-core 验证
        gc_validate_play_card(&self.battle_state, player_id, card_id, target_id)?;
        
        // 2. 调用 game-core 执行
        let result = gc_execute_play_card(&mut self.battle_state, player_id, card_id, target_id);
        
        // 3. 广播给所有玩家
        self.gs_broadcast(GsServerMsg::GsBattleUpdate { 
            result,
            state: self.battle_state.clone(),
        }).await;
        
        Ok(())
    }
}
```

---

## 📡 WebSocket 消息协议

### 客户端 → 服务器
```rust
#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum GsClientMsg {
    #[serde(rename = "gs_join_room")]
    GsJoinRoom { room_id: String },
    
    #[serde(rename = "gs_create_room")]
    GsCreateRoom { room_name: String },
    
    #[serde(rename = "gs_play_card")]
    GsPlayCard { card_id: String, target_id: String },
    
    #[serde(rename = "gs_ready")]
    GsReady,
}
```

### 服务器 → 客户端
```rust
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum GsServerMsg {
    #[serde(rename = "gs_room_joined")]
    GsRoomJoined { room: GsRoomInfo },
    
    #[serde(rename = "gs_battle_start")]
    GsBattleStart { state: GcBattleState },
    
    #[serde(rename = "gs_battle_update")]
    GsBattleUpdate { result: GcPlayCardResult, state: GcBattleState },
    
    #[serde(rename = "gs_error")]
    GsError { code: u32, message: String },
}
```

---

## 🔧 开发命令

```bash
# 开发运行 (热重载)
cd crates/game-server
cargo watch -x run

# 生产编译
cargo build --release

# 运行测试
cargo test

# 数据库迁移
sqlx migrate run
```

---

## 🗄️ 数据库表

```sql
-- 用户表
CREATE TABLE gs_users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 战绩表
CREATE TABLE gs_battle_records (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES gs_users(id),
    opponent_id UUID REFERENCES gs_users(id),
    winner_id UUID REFERENCES gs_users(id),
    battle_data JSONB,
    played_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚠️ AI 代理注意事项

1. **游戏逻辑调用 game-core** - 服务器只做协调
2. **所有消息类型加 `Gs` 前缀** - 便于识别来源
3. **使用 Arc<RwLock<T>> 管理共享状态** - 线程安全
4. **错误不要 panic** - 返回 GsError
5. **WebSocket 消息必须可序列化** - serde 派生
