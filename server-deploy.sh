#!/bin/bash
# 末日生存卡牌游戏 - 一键部署脚本
# 在服务器上运行此脚本

set -e

echo "=========================================="
echo "  末日生存卡牌游戏 - 自动部署"
echo "=========================================="

# 更新系统
echo "[1/8] 更新系统..."
sudo apt update -y

# 安装 Node.js 18.x
echo "[2/8] 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node版本: $(node -v)"
echo "NPM版本: $(npm -v)"

# 安装全局工具
echo "[3/8] 安装 PM2 和 TypeScript..."
sudo npm install -g pm2 typescript ts-node

# 安装 nginx
echo "[4/8] 安装 Nginx..."
sudo apt install -y nginx

# 创建项目目录
echo "[5/8] 设置项目目录..."
sudo mkdir -p /var/www/card-game
sudo chown -R $USER:$USER /var/www/card-game
cd /var/www/card-game

# 提示用户上传文件
echo ""
echo "请将项目文件上传到 /var/www/card-game 目录"
echo "可以使用以下命令从本地上传:"
echo "  scp -r packages package.json ubuntu@114.132.81.233:/var/www/card-game/"
echo ""
read -p "文件上传完成后按回车继续..."

# 安装依赖
echo "[6/8] 安装项目依赖..."
npm install

# 配置 Nginx
echo "[7/8] 配置 Nginx..."
sudo tee /etc/nginx/sites-available/card-game > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /var/www/card-game/packages/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/card-game /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 启动服务
echo "[8/8] 启动游戏服务器..."
cd /var/www/card-game
pm2 delete card-game-server 2>/dev/null || true
pm2 start "npm run dev:server" --name card-game-server
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://114.132.81.233"
echo ""
echo "管理命令:"
echo "  pm2 status        - 查看服务状态"
echo "  pm2 logs          - 查看日志"
echo "  pm2 restart all   - 重启服务"
echo ""
