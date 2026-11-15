param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appUrl = 'http://127.0.0.1:3000'
$runtimeDirectory = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

function Test-MissionServer {
  try {
    $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 2
    return $health.ok -eq $true -and $health.engine -eq 'deterministic'
  } catch { return $false }
}

if (-not (Test-MissionServer)) {
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  $nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
  $bundledNode = 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe'
  if (-not $nodeExecutable -and (Test-Path -LiteralPath $bundledNode)) { $nodeExecutable = $bundledNode }
  if (-not $nodeExecutable) { throw 'Instala Node.js 22 o superior y vuelve a ejecutar START_APP.cmd.' }
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\tsx\package.json'))) { throw 'Faltan dependencias. Ejecuta pnpm install en la carpeta del proyecto.' }
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) { throw 'Falta la compilacion. Ejecuta pnpm build en la carpeta del proyecto.' }
  $previousNodeEnv = $env:NODE_ENV
  try {
    $env:NODE_ENV = 'production'
    $process = Start-Process -FilePath $nodeExecutable -ArgumentList @('--import', 'tsx', 'server.ts', '--host', '127.0.0.1', '--port', '3000') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'server.log') -RedirectStandardError (Join-Path $runtimeDirectory 'server-error.log')
  } finally { $env:NODE_ENV = $previousNodeEnv }
  $process.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'server.pid')
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if (Test-MissionServer) { $ready = $true; break }
    if ($process.HasExited) { break }
    Start-Sleep -Milliseconds 300
  }
  if (-not $ready) {
    $errorLog = Join-Path $runtimeDirectory 'server-error.log'
    if (Test-Path -LiteralPath $errorLog) { Get-Content -LiteralPath $errorLog -Tail 12 | Write-Host }
    throw 'No se pudo iniciar la aplicacion. Revisa .runtime\server-error.log.'
  }
}
Write-Host "Aplicacion disponible: $appUrl"
if (-not $NoBrowser) { Start-Process $appUrl -WindowStyle Hidden }
