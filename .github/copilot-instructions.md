# GitHub Copilot 项目指令

> ⚠️ **重要：所有 AI 代理必须阅读此文件了解项目技术栈和规范**

---

## 🎯 项目目标

构建一个**精美 3D 网页卡牌游戏**，采用现代高性能技术栈。

---

## 🛠️ 技术栈要求 (必须遵守)

### 前端渲染 (client/)
| 技术 | 用途 | 备注 |
|------|------|------|
| **Babylon.js** | 3D 渲染引擎 | 优先使用 WebGPU，降级到 WebGL |
| **TypeScript** | 开发语言 | 严格类型检查 |
| **Vite** | 构建工具 | 保持现有配置 |

### 游戏逻辑层 (crates/game-wasm/)
| 技术 | 用途 | 备注 |
|------|------|------|
| **Rust** | 核心逻辑 | 编译到 WASM |
| **wasm-bindgen** | JS 绑定 | 导出给前端调用 |
| **serde** | 序列化 | JSON 格式与 JS 交互 |

### 后端服务器 (crates/game-server/)
| 技术 | 用途 | 备注 |
|------|------|------|
| **Rust** | 服务器语言 | 高性能 |
| **Axum** | Web 框架 | 异步处理 |
| **Tokio** | 异步运行时 | 必须使用 |
| **tokio-tungstenite** | WebSocket | 实时通信 |
| **sqlx** | 数据库 | PostgreSQL |

### 共享核心 (crates/game-core/)
| 技术 | 用途 | 备注 |
|------|------|------|
| **Rust** | 核心类型和逻辑 | 前后端共用 |
| 编译目标 | WASM + Native | 一套代码双端运行 |

---

## 📁 新项目结构 (迁移中)

```
my-3d-game/
├── Cargo.toml                    # Rust Workspace
├── crates/
│   ├── game-core/                # 🦀 共享核心逻辑
│   ├── game-wasm/                # 🦀 WASM 绑定
│   └── game-server/              # 🦀 后端服务器
├── client/                       # 🎨 前端 (Babylon.js)
└── assets/                       # 美术资源
```

---

## ⚠️ 代码规范

### Rust 代码规范
```rust
// ✅ 正确：使用 Result 处理错误
pub fn calculate_damage(attacker: &Player, target: &Player) -> Result<u32, GameError> {
    // ...
}

// ❌ 错误：使用 unwrap
let value = some_option.unwrap();  // 不要这样做
```

### TypeScript 代码规范
```typescript
// ✅ 正确：明确类型
async function initGame(canvas: HTMLCanvasElement): Promise<Game> {
    // ...
}

// ❌ 错误：使用 any
function doSomething(data: any) {  // 不要这样做
```

### WebGPU 初始化规范
```typescript
// ✅ 正确：带降级的 WebGPU 初始化
const engine = new BABYLON.WebGPUEngine(canvas);
try {
    await engine.initAsync();
} catch {
    // 降级到 WebGL
    engine = new BABYLON.Engine(canvas);
}
```

---

## 🚫 禁止事项

1. **不要使用** Node.js 作为后端 (正在迁移到 Rust)
2. **不要使用** React 渲染 3D 场景 (使用 Babylon.js)
3. **不要使用** WebGL 1.0 (至少 WebGL 2.0，优先 WebGPU)
4. **不要使用** JavaScript (使用 TypeScript)
5. **不要使用** `any` 类型
6. **不要使用** `.unwrap()` 在生产代码中

---

## ✅ 推荐做法

1. **优先** 在 game-core 中实现逻辑，前后端共享
2. **优先** 使用 WebGPU，自动降级到 WebGL
3. **优先** 使用 Rust 处理计算密集型任务
4. **优先** 使用 TypeScript 处理 UI 和渲染调用
5. **优先** 使用 JSON 在 WASM 和 JS 之间传递数据

---

## 🔧 开发命令

### Rust 开发
```bash
# 编译 WASM
cd crates/game-wasm && wasm-pack build --target web

# 运行服务器
cd crates/game-server && cargo run

# 运行测试
cargo test --workspace
```

### 前端开发
```bash
# 开发模式
cd client && pnpm dev

# 构建
cd client && pnpm build
```

---

## 服务器部署信息

本项目已配置 **SSH 密钥认证**，AI 代理可以无需密码直接操作服务器。

### 服务器连接信息

- **服务器 IP**: `114.132.81.233`
- **用户名**: `ubuntu`
- **认证方式**: SSH 密钥（已配置，无需密码）
- **项目路径**: `/var/www/card-game`

### 可直接执行的 SSH 命令示例

```bash
# 连接服务器
ssh ubuntu@114.132.81.233

# 执行远程命令
ssh ubuntu@114.132.81.233 "命令内容"

# 上传文件
scp 本地文件 ubuntu@114.132.81.233:/目标路径/

# 查看服务状态
ssh ubuntu@114.132.81.233 "pm2 status"

# 重启游戏服务
ssh ubuntu@114.132.81.233 "pm2 restart card-game-server"

# 查看服务日志
ssh ubuntu@114.132.81.233 "pm2 logs card-game-server --lines 50"
```

### 部署流程

1. 本地构建前端: `npm run build --workspace=packages/client`
2. 上传文件到服务器 `/var/www/card-game`
3. 服务器安装依赖: `npm install`
4. 重启服务: `pm2 restart card-game-server`

### 重要提示

- ✅ SSH 已配置密钥认证，所有 SSH/SCP 命令无需输入密码
- ✅ 可以直接使用 `ssh ubuntu@114.132.81.233` 连接
- ✅ 可以直接使用 `scp` 上传文件
- ❌ 不要使用 `-o StrictHostKeyChecking=no` 参数（已添加到 known_hosts）

### 项目结构

```
packages/
  client/     # 前端 React + Vite
  server/     # 后端 Node.js + Socket.IO
  shared/     # 共享类型定义
```

### 服务管理命令

```bash
# 启动服务
ssh ubuntu@114.132.81.233 "cd /var/www/card-game/packages/server && pm2 start src/index.ts --name card-game-server --interpreter ts-node"

# 停止服务
ssh ubuntu@114.132.81.233 "pm2 stop card-game-server"

# 重启服务
ssh ubuntu@114.132.81.233 "pm2 restart card-game-server"

# 查看日志
ssh ubuntu@114.132.81.233 "pm2 logs card-game-server"

# 重启 Nginx
ssh ubuntu@114.132.81.233 "sudo systemctl restart nginx"
```

### 游戏访问地址

http://114.132.81.233
