# 日志目录

此目录存放前后端运行日志，供 AI 代理查看调试。

## 日志文件

| 文件 | 内容 | 更新方式 |
|------|------|----------|
| `server.log` | Rust 后端日志 | 使用 `npm run dev:log` 启动时自动写入 |
| `client.log` | 前端浏览器日志 | 浏览器自动发送到后端保存 |

## 使用方法

### 启动并保存日志
```bash
npm run dev:log   # 同时启动前后端，并保存日志到文件
```

### 查看日志
```bash
npm run logs:view:server   # 查看后端日志
npm run logs:view:client   # 查看前端日志
```

### 清空日志
```bash
npm run logs:clear   # 清空所有日志
```

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/logs/client` | POST | 前端发送日志 |
| `/api/logs/client/view` | GET | 获取前端日志内容 |
| `/api/logs/client/clear` | POST | 清空前端日志 |

## 日志格式

### 前端日志 (client.log)
```
[2024-12-24T10:30:00.000Z] [LOG] 🦀 WASM 版本: 0.1.0
[2024-12-24T10:30:01.000Z] [INFO] 游戏初始化成功
[2024-12-24T10:30:02.000Z] [ERROR] 未捕获错误: ...
```

### 后端日志 (server.log)
```
2024-12-24T10:30:00 INFO  game_server > 🚀 启动游戏服务器...
2024-12-24T10:30:01 INFO  game_server > 🎮 服务器启动在 http://0.0.0.0:3000
```

## 注意事项

1. 前端日志每 2 秒或缓冲区满 50 条时自动刷新到文件
2. 页面关闭前会自动刷新剩余日志
3. 全局错误和未处理的 Promise 拒绝会被自动捕获
