# 📡 API 接口定义

> **此文件定义模块间通信的所有接口，确保一致性**

---

## 🔄 数据流概览

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (浏览器)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Babylon.js + WebGPU                 │  │
│  │                    (cl_scene_xxx.ts)                  │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │ 调用                          │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │                    WASM Bridge                        │  │
│  │                  (cl_wasm_bridge.ts)                  │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │ JSON                         │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │                   game-wasm (WASM)                    │  │
│  │                    (gw_bridge.rs)                     │  │
│  │                         │                             │  │
│  │           ┌─────────────▼─────────────┐               │  │
│  │           │       game-core           │               │  │
│  │           │   (gc_battle.rs 等)       │               │  │
│  │           └───────────────────────────┘               │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                              │
│                         WebSocket                          │
│                             │                              │
└─────────────────────────────┼──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                      game-server (Rust)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    WebSocket Handler                  │  │
│  │                      (gs_ws.rs)                       │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                              │
│  ┌──────────────────────────▼───────────────────────────┐  │
│  │                    game-core                          │  │
│  │              (服务器端验证 + 计算)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 核心类型定义 (game-core)

### GcPlayer - 玩家

```rust
/// 玩家数据
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayer {
    /// 唯一 ID (UUID)
    pub id: String,
    
    /// 显示名称
    pub name: String,
    
    /// 当前生命值
    pub hp: u32,
    
    /// 最大生命值
    pub max_hp: u32,
    
    /// 攻击力
    pub attack: u32,
    
    /// 防御力
    pub defense: u32,
    
    /// 手牌
    pub hand: Vec<GcCard>,
    
    /// 状态
    pub state: GcPlayerState,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GcPlayerState {
    Alive,
    Dead,
    Stunned,
    Disconnected,
}
```

### GcCard - 卡牌

```rust
/// 卡牌数据
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcCard {
    /// 唯一 ID
    pub id: String,
    
    /// 卡牌模板 ID
    pub template_id: String,
    
    /// 卡牌名称
    pub name: String,
    
    /// 卡牌类型
    pub card_type: GcCardType,
    
    /// 费用
    pub cost: u32,
    
    /// 基础伤害
    pub base_damage: u32,
    
    /// 效果列表
    pub effects: Vec<GcEffect>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GcCardType {
    Attack,
    Defense,
    Skill,
    Special,
}
```

### GcBattleState - 战斗状态

```rust
/// 战斗状态 (完整快照)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcBattleState {
    /// 战斗 ID
    pub id: String,
    
    /// 当前回合数
    pub turn: u32,
    
    /// 当前行动玩家 ID
    pub current_player_id: String,
    
    /// 所有玩家
    pub players: Vec<GcPlayer>,
    
    /// 战斗阶段
    pub phase: GcBattlePhase,
    
    /// 回合时间限制 (秒)
    pub turn_time_limit: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum GcBattlePhase {
    Starting,
    DrawCard,
    Playing,
    Ending,
    Finished,
}
```

### GcPlayCardResult - 出牌结果

```rust
/// 出牌操作结果
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcPlayCardResult {
    /// 是否成功
    pub success: bool,
    
    /// 错误信息 (失败时)
    pub error: Option<String>,
    
    /// 造成的伤害
    pub damage_dealt: u32,
    
    /// 触发的效果
    pub effects_triggered: Vec<GcEffectResult>,
    
    /// 更新后的战斗状态
    pub new_state: GcBattleState,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GcEffectResult {
    pub effect_name: String,
    pub target_id: String,
    pub value: i32,
}
```

---

## 📡 WASM 接口 (game-wasm)

### 导出函数

```rust
// gw_bridge.rs

use wasm_bindgen::prelude::*;
use game_core::*;

#[wasm_bindgen]
pub struct GwGameBridge { ... }

#[wasm_bindgen]
impl GwGameBridge {
    /// 创建新实例
    #[wasm_bindgen(constructor)]
    pub fn new() -> GwGameBridge;
    
    /// 初始化战斗
    /// @param players_json - GcPlayer[] JSON
    /// @returns GcBattleState JSON
    pub fn gw_init_battle(&mut self, players_json: &str) -> String;
    
    /// 执行出牌
    /// @param player_id - 玩家 ID
    /// @param card_id - 卡牌 ID  
    /// @param target_id - 目标 ID
    /// @returns GcPlayCardResult JSON
    pub fn gw_play_card(
        &mut self,
        player_id: &str,
        card_id: &str,
        target_id: &str,
    ) -> String;
    
    /// 获取当前状态
    /// @returns GcBattleState JSON
    pub fn gw_get_state(&self) -> String;
    
    /// 验证出牌合法性 (不执行)
    /// @returns { valid: boolean, error?: string } JSON
    pub fn gw_validate_play_card(
        &self,
        player_id: &str,
        card_id: &str,
        target_id: &str,
    ) -> String;
}
```

### TypeScript 类型声明

```typescript
// client/src/wasm/cl_wasm_types.ts

// 来自 game-core 的类型 (使用 Gc 前缀)
export interface GcPlayer {
    id: string;
    name: string;
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    hand: GcCard[];
    state: GcPlayerState;
}

export type GcPlayerState = 'Alive' | 'Dead' | 'Stunned' | 'Disconnected';

export interface GcCard {
    id: string;
    template_id: string;
    name: string;
    card_type: GcCardType;
    cost: number;
    base_damage: number;
    effects: GcEffect[];
}

export type GcCardType = 'Attack' | 'Defense' | 'Skill' | 'Special';

export interface GcBattleState {
    id: string;
    turn: number;
    current_player_id: string;
    players: GcPlayer[];
    phase: GcBattlePhase;
    turn_time_limit: number;
}

export type GcBattlePhase = 'Starting' | 'DrawCard' | 'Playing' | 'Ending' | 'Finished';

export interface GcPlayCardResult {
    success: boolean;
    error?: string;
    damage_dealt: number;
    effects_triggered: GcEffectResult[];
    new_state: GcBattleState;
}
```

---

## 📡 WebSocket 消息 (game-server)

### 客户端 → 服务器

```typescript
// 消息类型 (使用 Gs 前缀)
type GsClientMsg = 
    | GsClientMsgJoinRoom
    | GsClientMsgCreateRoom
    | GsClientMsgLeaveRoom
    | GsClientMsgReady
    | GsClientMsgPlayCard
    | GsClientMsgChat;

interface GsClientMsgJoinRoom {
    type: 'gs_join_room';
    room_id: string;
}

interface GsClientMsgCreateRoom {
    type: 'gs_create_room';
    room_name: string;
    max_players: number;
}

interface GsClientMsgLeaveRoom {
    type: 'gs_leave_room';
}

interface GsClientMsgReady {
    type: 'gs_ready';
}

interface GsClientMsgPlayCard {
    type: 'gs_play_card';
    card_id: string;
    target_id: string;
}

interface GsClientMsgChat {
    type: 'gs_chat';
    message: string;
}
```

### 服务器 → 客户端

```typescript
type GsServerMsg =
    | GsServerMsgConnected
    | GsServerMsgRoomJoined
    | GsServerMsgRoomLeft
    | GsServerMsgRoomUpdated
    | GsServerMsgBattleStart
    | GsServerMsgBattleUpdate
    | GsServerMsgBattleEnd
    | GsServerMsgError
    | GsServerMsgChat;

interface GsServerMsgConnected {
    type: 'gs_connected';
    player_id: string;
}

interface GsServerMsgRoomJoined {
    type: 'gs_room_joined';
    room: GsRoomInfo;
    players: GsPlayerInfo[];
}

interface GsServerMsgBattleStart {
    type: 'gs_battle_start';
    state: GcBattleState;  // 使用 Gc 类型
}

interface GsServerMsgBattleUpdate {
    type: 'gs_battle_update';
    result: GcPlayCardResult;  // 使用 Gc 类型
    state: GcBattleState;
}

interface GsServerMsgError {
    type: 'gs_error';
    code: number;
    message: string;
}
```

### 服务器类型

```typescript
interface GsRoomInfo {
    id: string;
    name: string;
    host_id: string;
    max_players: number;
    current_players: number;
    state: GsRoomState;
}

type GsRoomState = 'Waiting' | 'Starting' | 'Playing' | 'Finished';

interface GsPlayerInfo {
    id: string;
    name: string;
    is_ready: boolean;
    is_host: boolean;
}
```

---

## 🔧 错误码定义

```typescript
// 通用错误码 (1xxx)
const GS_ERR_UNKNOWN = 1000;
const GS_ERR_INVALID_JSON = 1001;
const GS_ERR_UNAUTHORIZED = 1002;

// 房间错误码 (2xxx)
const GS_ERR_ROOM_NOT_FOUND = 2001;
const GS_ERR_ROOM_FULL = 2002;
const GS_ERR_ROOM_PLAYING = 2003;
const GS_ERR_NOT_IN_ROOM = 2004;
const GS_ERR_NOT_HOST = 2005;

// 战斗错误码 (3xxx)
const GS_ERR_NOT_YOUR_TURN = 3001;
const GS_ERR_CARD_NOT_FOUND = 3002;
const GS_ERR_INVALID_TARGET = 3003;
const GS_ERR_NOT_ENOUGH_COST = 3004;
const GS_ERR_BATTLE_ENDED = 3005;
```

---

## ⚠️ AI 代理注意事项

1. **类型定义统一来源** - Rust 定义，TypeScript 同步
2. **Gc 前缀 = 来自 game-core** - 跨模块使用时保持
3. **Gs 前缀 = 来自 game-server** - 服务器消息类型
4. **JSON 作为通信格式** - WASM 和 WebSocket 都用 JSON
5. **修改类型时同步更新** - Rust 和 TypeScript 必须一致
