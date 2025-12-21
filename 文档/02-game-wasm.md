# 🌐 game-wasm 模块文档

> **模块前缀**: `gw_` | **语言**: Rust | **编译目标**: WASM

---

## 📋 模块职责

```
game-wasm 是 WASM 绑定层，连接 game-core 和前端 JavaScript

✅ 可以做:
├── 使用 wasm-bindgen 导出函数
├── JSON 序列化/反序列化
├── 调用 game-core 的函数
└── 管理 WASM 端的游戏状态

❌ 不可以做:
├── 实现游戏逻辑 (应在 game-core)
├── 网络请求
├── 直接操作 DOM
└── 调用浏览器特定 API (除非通过 JS 回调)
```

---

## 📁 文件结构

```
crates/game-wasm/
├── Cargo.toml
└── src/
    ├── lib.rs              # WASM 入口
    ├── gw_bridge.rs        # 🌉 JS 桥接层
    ├── gw_battle.rs        # ⚔️ 战斗接口
    ├── gw_player.rs        # 👤 玩家接口
    └── gw_utils.rs         # 🔧 工具函数
```

---

## 🏷️ 命名规范

### 文件名
```
gw_xxx.rs    # 全部小写，gw_ 前缀
```

### 导出的结构体
```rust
// ✅ 正确: Gw 前缀，用于 wasm-bindgen 导出
#[wasm_bindgen]
pub struct GwGameBridge { ... }

#[wasm_bindgen]
pub struct GwBattleManager { ... }
```

### 导出的函数
```rust
// ✅ 正确: gw_ 前缀
#[wasm_bindgen]
pub fn gw_init() -> GwGameBridge { ... }

#[wasm_bindgen]
pub fn gw_calculate_damage(json: &str) -> String { ... }
```

---

## 📊 核心导出

### GwGameBridge - 主桥接类
```rust
use wasm_bindgen::prelude::*;
use game_core::*;

/// 游戏桥接器 - 前端调用的主入口
#[wasm_bindgen]
pub struct GwGameBridge {
    battle_state: Option<GcBattleState>,
}

#[wasm_bindgen]
impl GwGameBridge {
    /// 创建新实例
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self { battle_state: None }
    }
    
    /// 初始化战斗
    /// 
    /// # Arguments
    /// * `players_json` - 玩家数组 JSON
    /// 
    /// # Returns
    /// * 初始化后的战斗状态 JSON
    pub fn gw_init_battle(&mut self, players_json: &str) -> String {
        let players: Vec<GcPlayer> = serde_json::from_str(players_json)
            .expect("Invalid players JSON");
        
        let state = GcBattleState::new(players);
        self.battle_state = Some(state.clone());
        
        serde_json::to_string(&state).unwrap()
    }
    
    /// 执行出牌
    pub fn gw_play_card(
        &mut self, 
        player_id: &str, 
        card_id: &str, 
        target_id: &str
    ) -> String {
        let state = self.battle_state.as_mut().expect("Battle not initialized");
        
        // 调用 game-core 验证
        if let Err(e) = gc_validate_play_card(state, player_id, card_id, target_id) {
            return serde_json::to_string(&GwError::from(e)).unwrap();
        }
        
        // 调用 game-core 计算
        let result = gc_execute_play_card(state, player_id, card_id, target_id);
        
        serde_json::to_string(&result).unwrap()
    }
}
```

---

## 📡 前端调用示例

```typescript
// client/src/wasm/gw_bridge.ts

import init, { GwGameBridge } from '../../pkg/game_wasm';

let bridge: GwGameBridge | null = null;

export async function gwInit(): Promise<void> {
    await init();
    bridge = new GwGameBridge();
}

export function gwInitBattle(players: GcPlayer[]): GcBattleState {
    const json = bridge!.gw_init_battle(JSON.stringify(players));
    return JSON.parse(json);
}

export function gwPlayCard(
    playerId: string, 
    cardId: string, 
    targetId: string
): GwPlayCardResult {
    const json = bridge!.gw_play_card(playerId, cardId, targetId);
    return JSON.parse(json);
}
```

---

## 🔧 编译命令

```bash
# 开发编译
cd crates/game-wasm
wasm-pack build --target web --dev

# 生产编译
wasm-pack build --target web --release

# 输出位置
# crates/game-wasm/pkg/
#   ├── game_wasm.js
#   ├── game_wasm.d.ts
#   ├── game_wasm_bg.wasm
#   └── package.json
```

---

## ⚠️ AI 代理注意事项

1. **逻辑实现在 game-core** - 此模块只做绑定
2. **JSON 作为数据交换格式** - 使用 serde_json
3. **错误必须序列化返回** - 不要 panic
4. **新增导出必须加 `gw_` 前缀** - 便于前端识别
5. **每次修改后重新编译 WASM** - `wasm-pack build`
