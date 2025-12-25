# 3D 卡牌游戏 - 新架构部署脚本 (Rust + Babylon.js)
# 使用 SSH 密钥认证，无需密码

$ErrorActionPreference = "Stop"

$SERVER = "114.132.81.233"
$USER = "ubuntu"
$REMOTE_PATH = "/var/www/card-game"
$LOCAL_PATH = "D:\测试卡牌游戏"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  3D 卡牌游戏 - 新架构部署" -ForegroundColor Cyan
Write-Host "  技术栈: Rust + Babylon.js + WebGPU" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 SSH 连接
Write-Host "[1/6] 测试 SSH 连接..." -ForegroundColor Yellow
$result = ssh -o BatchMode=yes -o ConnectTimeout=10 "$USER@$SERVER" "echo OK" 2>&1
if ($result -ne "OK") {
    Write-Host "[错误] SSH 连接失败，请检查网络或 SSH 配置" -ForegroundColor Red
    exit 1
}
Write-Host "[成功] SSH 无密码连接正常" -ForegroundColor Green

# 步骤 2: 本地构建前端
Write-Host ""
Write-Host "[2/6] 本地构建前端..." -ForegroundColor Yellow
Set-Location "$LOCAL_PATH\client"

# 检查是否需要安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "  安装前端依赖..." -ForegroundColor Gray
    npm install
}

# 构建
Write-Host "  构建 Vite 项目..." -ForegroundColor Gray
npm run build

if (-not (Test-Path "dist\index.html")) {
    Write-Host "[错误] 构建失败，找不到 dist/index.html" -ForegroundColor Red
    exit 1
}
Write-Host "[成功] 前端构建完成" -ForegroundColor Green

# 步骤 3: 服务器环境准备
Write-Host ""
Write-Host "[3/6] 准备服务器环境..." -ForegroundColor Yellow

ssh "$USER@$SERVER" "sudo mkdir -p /var/www/card-game/client/dist; sudo chown -R ubuntu:ubuntu /var/www/card-game"

Write-Host "[成功] 服务器环境就绪" -ForegroundColor Green

# 步骤 4: 上传前端文件
Write-Host ""
Write-Host "[4/6] 上传前端文件到服务器..." -ForegroundColor Yellow

# 清理远程旧文件
ssh "$USER@$SERVER" "rm -rf $REMOTE_PATH/client/dist/*"

# 上传 dist 目录
Write-Host "  上传 dist 目录..." -ForegroundColor Gray
scp -r "$LOCAL_PATH\client\dist\*" "${USER}@${SERVER}:${REMOTE_PATH}/client/dist/"

Write-Host "[成功] 前端文件上传完成" -ForegroundColor Green

# 步骤 5: 配置 Nginx
Write-Host ""
Write-Host "[5/6] 配置 Nginx..." -ForegroundColor Yellow

$nginxConfig = @"
server {
    listen 80;
    server_name _;

    root /var/www/card-game/client/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|wasm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.wasm$ {
        add_header Content-Type application/wasm;
        expires 30d;
    }

    location / {
        try_files `\$uri `\$uri/ /index.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `\$host;
        proxy_set_header X-Real-IP `\$remote_addr;
        proxy_read_timeout 86400;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host `\$host;
        proxy_set_header X-Real-IP `\$remote_addr;
    }
}
"@

$nginxConfig | ssh "$USER@$SERVER" "sudo tee /etc/nginx/sites-available/card-game > /dev/null"
ssh "$USER@$SERVER" "sudo ln -sf /etc/nginx/sites-available/card-game /etc/nginx/sites-enabled/"
ssh "$USER@$SERVER" "sudo rm -f /etc/nginx/sites-enabled/default"
ssh "$USER@$SERVER" "sudo nginx -t"
ssh "$USER@$SERVER" "sudo systemctl reload nginx"

Write-Host "[成功] Nginx 配置完成" -ForegroundColor Green

# 步骤 6: 完成
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  部署成功!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址: http://114.132.81.233" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示:" -ForegroundColor Gray
Write-Host "  - 前端已部署到 /var/www/card-game/client/dist" -ForegroundColor Gray
Write-Host "  - 如需部署 Rust 后端，请在服务器编译并运行" -ForegroundColor Gray
Write-Host ""
