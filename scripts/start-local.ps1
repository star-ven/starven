$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = "C:\Users\xieqi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$pnpmPath = "C:\Users\xieqi\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$localUrl = "http://localhost:5173"

if (-not (Test-Path -LiteralPath $nodePath)) {
  throw "找不到本机 Node.js 运行环境，请重新在 Codex 中运行本地部署。"
}
if (-not (Test-Path -LiteralPath $pnpmPath)) {
  throw "找不到本机包管理器，请重新在 Codex 中运行本地部署。"
}

Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
  Write-Host "首次启动：正在安装网站依赖，请稍候……"
  & $pnpmPath install --no-frozen-lockfile --config.dangerouslyAllowAllBuilds=true
  if ($LASTEXITCODE -ne 0) { throw "依赖安装失败。" }
}

$browserHelper = @"
for (`$attempt = 0; `$attempt -lt 60; `$attempt++) {
  try {
    `$response = Invoke-WebRequest -Uri '$localUrl' -UseBasicParsing -TimeoutSec 2
    if (`$response.StatusCode -lt 500) { Start-Process '$localUrl'; exit 0 }
  } catch {}
  Start-Sleep -Seconds 1
}
"@
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @("-NoProfile", "-Command", $browserHelper)

Write-Host "本地网站启动后会自动打开：$localUrl"
Write-Host "修改源码并保存后，页面会自动刷新。关闭此窗口即可停止本地网站。"
& $pnpmPath run dev
