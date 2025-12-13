# GitHub Copilot 项目指令

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
