# 末日生存卡牌游戏 - Windows 一键部署脚本
# 使用 SSH 密钥认证，无需输入密码

$ErrorActionPreference = "Stop"

$SERVER = "114.132.81.233"
$USER = "ubuntu"
$REMOTE_PATH = "/var/www/card-game"
$LOCAL_PATH = "D:\测试卡牌游戏"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  末日生存卡牌游戏 - 一键部署脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 SSH 无密码连接
Write-Host "[检查] 测试 SSH 连接..." -ForegroundColor Yellow
try {
    $result = ssh -o BatchMode=yes -o ConnectTimeout=10 "${USER}@${SERVER}" "echo OK" 2>&1
    if ($result -ne "OK") {
        throw "SSH 连接失败"
    }
    Write-Host "[成功] SSH 无密码连接正常" -ForegroundColor Green
} catch {
    Write-Host "[错误] SSH 无密码连接失败，请先运行 setup-ssh-key.ps1" -ForegroundColor Red
    exit 1
}

# 步骤 1: 本地构建
Write-Host ""
Write-Host "[1/5] 本地安装依赖..." -ForegroundColor Yellow
Set-Location $LOCAL_PATH
npm install

Write-Host ""
Write-Host "[2/5] 构建前端项目..." -ForegroundColor Yellow
npm run build --workspace=packages/client

# 步骤 2: 服务器环境准备
Write-Host ""
Write-Host "[3/5] 准备服务器环境..." -ForegroundColor Yellow
$setupScript = @'
#!/bin/bash
set -e

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
fi

# 检查 nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt install -y nginx
fi

# 创建目录
sudo mkdir -p /var/www/card-game
sudo chown -R ubuntu:ubuntu /var/www/card-game

echo "服务器环境准备完成"
'@
$setupScript | ssh "${USER}@${SERVER}" "bash -s"

# 步骤 3: 上传文件
Write-Host ""
Write-Host "[4/5] 上传项目文件到服务器..." -ForegroundColor Yellow

# 上传 package.json 和依赖配置
scp "${LOCAL_PATH}\package.json" "${USER}@${SERVER}:${REMOTE_PATH}/"
scp "${LOCAL_PATH}\package-lock.json" "${USER}@${SERVER}:${REMOTE_PATH}/" 2>$null

# 上传 packages 目录
Write-Host "  上传 shared 模块..."
ssh "${USER}@${SERVER}" "mkdir -p ${REMOTE_PATH}/packages/shared"
scp -r "${LOCAL_PATH}\packages\shared\*" "${USER}@${SERVER}:${REMOTE_PATH}/packages/shared/"

Write-Host "  上传 server 模块..."
ssh "${USER}@${SERVER}" "mkdir -p ${REMOTE_PATH}/packages/server"
scp -r "${LOCAL_PATH}\packages\server\*" "${USER}@${SERVER}:${REMOTE_PATH}/packages/server/"

Write-Host "  上传 client 构建产物..."
ssh "${USER}@${SERVER}" "mkdir -p ${REMOTE_PATH}/packages/client/dist"
scp -r "${LOCAL_PATH}\packages\client\dist\*" "${USER}@${SERVER}:${REMOTE_PATH}/packages/client/dist/"
scp "${LOCAL_PATH}\packages\client\package.json" "${USER}@${SERVER}:${REMOTE_PATH}/packages/client/"

# 步骤 4: 服务器端安装和启动
Write-Host ""
Write-Host "[5/5] 服务器端安装依赖并启动服务..." -ForegroundColor Yellow
$startScript = @'
#!/bin/bash
set -e
cd /var/www/card-game

# 安装依赖
echo "安装项目依赖..."
npm install --production

# 安装 ts-node 用于运行 TypeScript
npm install -g ts-node typescript

# 配置 Nginx
echo "配置 Nginx..."
sudo tee /etc/nginx/sites-available/card-game > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/card-game/packages/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }

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

# 停止旧服务并启动新服务
echo "启动游戏服务..."
pm2 delete card-game-server 2>/dev/null || true
cd /var/www/card-game/packages/server
pm2 start src/index.ts --name card-game-server --interpreter ts-node
pm2 save

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo "游戏地址: http://114.132.81.233"
echo ""
'@
$startScript | ssh "${USER}@${SERVER}" "bash -s"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  部署成功完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "游戏访问地址: http://114.132.81.233" -ForegroundColor Cyan
Write-Host ""
