#!/bin/bash

# 末日生存卡牌游戏 - 服务器部署脚本
# 服务器: 114.132.81.233
# 用户: ubuntu

echo "=========================================="
echo "  末日生存卡牌游戏 - 部署脚本"
echo "=========================================="

# 1. 更新系统
echo "[1/7] 更新系统..."
sudo apt update -y

# 2. 安装 Node.js 18.x
echo "[2/7] 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 PM2 (进程管理器)
echo "[3/7] 安装 PM2..."
sudo npm install -g pm2

# 4. 创建项目目录
echo "[4/7] 创建项目目录..."
sudo mkdir -p /var/www/card-game
sudo chown -R ubuntu:ubuntu /var/www/card-game

# 5. 安装 nginx (可选，用于反向代理)
echo "[5/7] 安装 Nginx..."
sudo apt install -y nginx

# 配置 nginx
sudo tee /etc/nginx/sites-available/card-game > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /var/www/card-game/packages/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/card-game /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "[6/7] 配置防火墙..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

echo "[7/7] 部署完成！"
echo ""
echo "接下来请上传项目文件到 /var/www/card-game"
echo "然后运行以下命令启动服务："
echo "  cd /var/www/card-game"
echo "  npm install"
echo "  npm run build --workspace=packages/client"
echo "  pm2 start packages/server/src/index.ts --name card-game-server --interpreter ts-node"
echo ""
echo "访问地址: http://114.132.81.233"
