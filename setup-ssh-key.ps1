# SSH Key Setup Script
# 这个脚本只需要运行一次，用于将本地SSH公钥添加到服务器

$server = "114.132.81.233"
$user = "ubuntu"
$pubkeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $pubkeyPath)) {
    Write-Host "SSH公钥不存在，正在生成..."
    ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N '""'
}

$pubkey = Get-Content $pubkeyPath -Raw
$pubkey = $pubkey.Trim()

Write-Host "=========================================="
Write-Host "SSH 密钥设置脚本"
Write-Host "=========================================="
Write-Host ""
Write-Host "服务器: $server"
Write-Host "用户名: $user"
Write-Host ""
Write-Host "请在下面的提示中输入服务器密码: 123qwe,./"
Write-Host ""
Write-Host "执行命令中..."

# 使用 ssh 连接并添加公钥
$command = "mkdir -p ~/.ssh; chmod 700 ~/.ssh; grep -qxF '$pubkey' ~/.ssh/authorized_keys 2>/dev/null || echo '$pubkey' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; echo 'SUCCESS: SSH key has been added!'"

ssh "${user}@${server}" $command

Write-Host ""
Write-Host "=========================================="
Write-Host "设置完成后，测试无密码连接："
Write-Host "ssh ubuntu@114.132.81.233 'echo OK'"
Write-Host "=========================================="
