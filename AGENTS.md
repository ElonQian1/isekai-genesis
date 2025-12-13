# AI 代理部署指南

本项目已配置 SSH 密钥认证，所有 AI 代理可以**无需密码**直接操作服务器。

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP 地址 | `114.132.81.233` |
| 用户名 | `ubuntu` |
| 认证方式 | SSH 密钥（无需密码） |
| 项目路径 | `/var/www/card-game` |
| 游戏地址 | http://114.132.81.233 |

## 快速命令

```bash
# 连接服务器（无需密码）
ssh ubuntu@114.132.81.233

# 重启游戏服务
ssh ubuntu@114.132.81.233 "pm2 restart card-game-server"

# 查看服务日志
ssh ubuntu@114.132.81.233 "pm2 logs card-game-server --lines 100"

# 上传文件
scp 文件 ubuntu@114.132.81.233:/var/www/card-game/目标路径/
```

## 完整部署命令

```bash
# 1. 本地构建
npm run build --workspace=packages/client

# 2. 上传到服务器
scp -r packages/client/dist/* ubuntu@114.132.81.233:/var/www/card-game/packages/client/dist/
scp -r packages/server/src/* ubuntu@114.132.81.233:/var/www/card-game/packages/server/src/
scp -r packages/shared/src/* ubuntu@114.132.81.233:/var/www/card-game/packages/shared/src/

# 3. 重启服务
ssh ubuntu@114.132.81.233 "cd /var/www/card-game && npm install && pm2 restart card-game-server"
```
