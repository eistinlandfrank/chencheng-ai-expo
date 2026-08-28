@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动辰程 AI 本地网页...
echo 电脑访问: http://127.0.0.1:3000
echo 手机访问地址（选择与手机同一网络的地址）:
powershell -NoProfile -Command "Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.IPv4Address -ne $null } ^| ForEach-Object { '  http://' + $_.IPv4Address.IPAddress + ':3000' }"
echo.
"C:\Users\flowphy\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\node_modules\vinext\dist\cli.js" start --hostname 0.0.0.0 --port 3000
pause
