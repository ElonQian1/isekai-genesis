# 🎨 client 前端模块文档

> **模块前缀**: `cl_` / `Cl` | **语言**: TypeScript | **渲染**: Babylon.js + WebGPU

---

## 📋 模块职责

```
client 是前端渲染和交互层

✅ 可以做:
├── Babylon.js 3D 渲染
├── WebGPU/WebGL 图形调用
├── 用户界面和交互
├── 调用 WASM 模块 (game-wasm)
├── WebSocket 网络通信
└── 音效和动画

❌ 不可以做:
├── 实现游戏核心逻辑 (调用 WASM)
├── 直接计算伤害 (调用 WASM)
└── 信任客户端计算 (服务器验证)
```

---

## 📁 文件结构

```
client/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.ts                 # 🚀 入口
    ├── cl_app.ts               # 📱 应用初始化
    │
    ├── game/                   # 🎮 游戏核心
    │   ├── cl_game.ts          # 游戏主类
    │   ├── cl_engine.ts        # 渲染引擎封装
    │   └── cl_input.ts         # 输入处理
    │
    ├── scenes/                 # 🎬 3D 场景
    │   ├── cl_scene_base.ts    # 场景基类
    │   ├── cl_scene_battle.ts  # 战斗场景
    │   ├── cl_scene_lobby.ts   # 大厅场景
    │   └── cl_scene_loading.ts # 加载场景
    │
    ├── entities/               # 🎭 3D 实体
    │   ├── cl_entity_card.ts   # 卡牌实体
    │   ├── cl_entity_player.ts # 玩家实体
    │   └── cl_entity_effect.ts # 特效实体
    │
    ├── ui/                     # 🖼️ 用户界面
    │   ├── cl_ui_hud.ts        # HUD
    │   ├── cl_ui_menu.ts       # 菜单
    │   └── cl_ui_dialog.ts     # 对话框
    │
    ├── wasm/                   # 🌐 WASM 桥接
    │   ├── cl_wasm_bridge.ts   # WASM 调用封装
    │   └── cl_wasm_types.ts    # 类型定义
    │
    ├── network/                # 📡 网络通信
    │   ├── cl_net_socket.ts    # WebSocket 封装
    │   └── cl_net_messages.ts  # 消息类型
    │
    └── utils/                  # 🔧 工具
        ├── cl_utils_math.ts    # 数学工具
        └── cl_utils_asset.ts   # 资源加载
```

---

## 🏷️ 命名规范

### 文件名
```
cl_xxx_yyy.ts    # 全部小写，cl_ 前缀，下划线分隔

示例:
cl_scene_battle.ts   # 战斗场景
cl_entity_card.ts    # 卡牌实体
cl_ui_hud.ts         # HUD 界面
```

### 类名
```typescript
// ✅ 正确: Cl 前缀 + PascalCase
class ClGame { ... }
class ClSceneBattle { ... }
class ClEntityCard { ... }
class ClNetSocket { ... }

// ❌ 错误: 无前缀
class Game { ... }       // 太通用，会混淆
class BattleScene { ... }
```

### 函数名
```typescript
// ✅ 正确: cl 前缀 + camelCase (模块级函数)
function clInitEngine(canvas: HTMLCanvasElement): ClEngine { ... }
function clLoadAssets(manifest: ClAssetManifest): Promise<void> { ... }

// ✅ 正确: 类方法无需前缀
class ClGame {
    start(): void { ... }
    update(deltaTime: number): void { ... }
}
```

### 接口/类型
```typescript
// ✅ 正确: Cl 前缀 + PascalCase
interface ClGameConfig {
    canvas: HTMLCanvasElement;
    debug: boolean;
}

type ClSceneType = 'battle' | 'lobby' | 'loading';

// ✅ 来自 WASM 的类型使用 Gc 前缀 (保持一致)
interface GcPlayer { ... }   // 来自 game-core
interface GcCard { ... }     // 来自 game-core
```

---

## 📊 核心类

### ClGame - 游戏主类
```typescript
// src/game/cl_game.ts

import * as BABYLON from '@babylonjs/core';
import { ClEngine } from './cl_engine';
import { ClSceneBase } from '../scenes/cl_scene_base';
import { clWasmInit } from '../wasm/cl_wasm_bridge';

export class ClGame {
    private engine: ClEngine;
    private currentScene: ClSceneBase | null = null;
    
    constructor(private config: ClGameConfig) {}
    
    async init(): Promise<void> {
        // 1. 初始化 WASM
        await clWasmInit();
        
        // 2. 初始化渲染引擎 (WebGPU 优先)
        this.engine = await ClEngine.create(this.config.canvas);
        
        // 3. 加载资源
        await this.loadAssets();
        
        // 4. 进入大厅场景
        await this.changeScene('lobby');
    }
    
    async changeScene(type: ClSceneType): Promise<void> {
        if (this.currentScene) {
            this.currentScene.dispose();
        }
        
        switch (type) {
            case 'battle':
                this.currentScene = new ClSceneBattle(this.engine);
                break;
            case 'lobby':
                this.currentScene = new ClSceneLobby(this.engine);
                break;
        }
        
        await this.currentScene.init();
    }
}
```

### ClEngine - 渲染引擎封装
```typescript
// src/game/cl_engine.ts

import * as BABYLON from '@babylonjs/core';

export class ClEngine {
    private engine: BABYLON.Engine | BABYLON.WebGPUEngine;
    
    private constructor(engine: BABYLON.Engine | BABYLON.WebGPUEngine) {
        this.engine = engine;
    }
    
    /**
     * 创建引擎 (WebGPU 优先，自动降级到 WebGL)
     */
    static async create(canvas: HTMLCanvasElement): Promise<ClEngine> {
        // 尝试 WebGPU
        if (navigator.gpu) {
            try {
                const engine = new BABYLON.WebGPUEngine(canvas);
                await engine.initAsync();
                console.log('🚀 Using WebGPU');
                return new ClEngine(engine);
            } catch (e) {
                console.warn('WebGPU failed, falling back to WebGL');
            }
        }
        
        // 降级到 WebGL
        const engine = new BABYLON.Engine(canvas, true);
        console.log('📦 Using WebGL');
        return new ClEngine(engine);
    }
    
    get raw(): BABYLON.Engine {
        return this.engine;
    }
    
    createScene(): BABYLON.Scene {
        return new BABYLON.Scene(this.engine);
    }
}
```

### ClSceneBattle - 战斗场景
```typescript
// src/scenes/cl_scene_battle.ts

import * as BABYLON from '@babylonjs/core';
import { ClSceneBase } from './cl_scene_base';
import { ClEntityCard } from '../entities/cl_entity_card';
import { clWasmPlayCard } from '../wasm/cl_wasm_bridge';

export class ClSceneBattle extends ClSceneBase {
    private cards: ClEntityCard[] = [];
    private battleState: GcBattleState | null = null;
    
    async init(): Promise<void> {
        await super.init();
        
        // 设置相机
        this.setupCamera();
        
        // 设置光照
        this.setupLighting();
        
        // 加载战斗场景
        await this.loadBattleArena();
    }
    
    /**
     * 玩家点击卡牌
     */
    async onCardClick(cardEntity: ClEntityCard, targetId: string): Promise<void> {
        const cardId = cardEntity.cardData.id;
        const playerId = this.localPlayerId;
        
        // 调用 WASM 计算
        const result = clWasmPlayCard(playerId, cardId, targetId);
        
        if (result.success) {
            // 播放动画
            await this.playCardAnimation(cardEntity, targetId, result);
            
            // 更新状态
            this.updateBattleState(result.newState);
        } else {
            // 显示错误
            this.showError(result.error);
        }
    }
}
```

---

## 🌐 WASM 调用

### cl_wasm_bridge.ts
```typescript
// src/wasm/cl_wasm_bridge.ts

import init, { GwGameBridge } from '../../crates/game-wasm/pkg';

let bridge: GwGameBridge | null = null;

/**
 * 初始化 WASM 模块
 */
export async function clWasmInit(): Promise<void> {
    await init();
    bridge = new GwGameBridge();
    console.log('🦀 WASM initialized');
}

/**
 * 初始化战斗
 */
export function clWasmInitBattle(players: GcPlayer[]): GcBattleState {
    const json = bridge!.gw_init_battle(JSON.stringify(players));
    return JSON.parse(json);
}

/**
 * 执行出牌
 */
export function clWasmPlayCard(
    playerId: string,
    cardId: string,
    targetId: string
): ClPlayCardResult {
    const json = bridge!.gw_play_card(playerId, cardId, targetId);
    return JSON.parse(json);
}
```

---

## 📡 网络通信

### cl_net_socket.ts
```typescript
// src/network/cl_net_socket.ts

export class ClNetSocket {
    private ws: WebSocket | null = null;
    private handlers: Map<string, (data: any) => void> = new Map();
    
    connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);
            this.ws.onopen = () => resolve();
            this.ws.onerror = reject;
            this.ws.onmessage = (event) => this.handleMessage(event);
        });
    }
    
    /**
     * 发送消息到服务器
     */
    send(msg: GsClientMsg): void {
        this.ws?.send(JSON.stringify(msg));
    }
    
    /**
     * 注册消息处理器
     */
    on<T extends GsServerMsg['type']>(
        type: T, 
        handler: (data: Extract<GsServerMsg, { type: T }>) => void
    ): void {
        this.handlers.set(type, handler);
    }
}
```

---

## ⚠️ AI 代理注意事项

1. **游戏逻辑调用 WASM** - 不在前端实现
2. **所有类/文件加 `Cl` 或 `cl_` 前缀** - 防止混淆
3. **WebGPU 必须有 WebGL 降级** - 兼容性
4. **使用 `GcXxx` 类型** - 来自 game-core 的类型
5. **使用 `GsXxx` 消息类型** - 来自 game-server 的消息
6. **异步操作使用 async/await** - 不用回调
