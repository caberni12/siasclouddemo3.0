$ErrorActionPreference = 'SilentlyContinue'
$Port = 18891
$Root = $PSScriptRoot
$Profile = Join-Path $env:LOCALAPPDATA 'SiasCloudERP\BrowserProfile'
$ServerScript = Join-Path $Root 'SiasCloudServer.ps1'
New-Item -ItemType Directory -Force -Path $Profile | Out-Null

function Test-SiasCloudServer {
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/__siascloud/health" -TimeoutSec 1
    return $r.StatusCode -eq 200
  } catch { return $false }
}

if (-not (Test-SiasCloudServer)) {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"'+$ServerScript+'"'),'-Port',$Port,'-Root',('"'+$Root+'"')) | Out-Null
  $ready = $false
  for ($i=0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 100
    if (Test-SiasCloudServer) { $ready=$true; break }
  }
  if (-not $ready) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('No se pudo iniciar el servicio local de SiasCloud ERP.','SiasCloud ERP','OK','Error') | Out-Null
    exit 3
  }
}

$browser = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $browser) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('SiasCloud ERP necesita Microsoft Edge o Google Chrome. Windows 10/11 normalmente ya incluye Edge.','SiasCloud ERP','OK','Error') | Out-Null
  exit 4
}

$url = "http://127.0.0.1:$Port/index.html"
$args = @(
  "--app=$url",
  "--user-data-dir=$Profile",
  '--start-maximized',
  '--kiosk-printing',
  '--no-first-run',
  '--disable-background-mode',
  '--disable-features=TranslateUI'
)
Start-Process -FilePath $browser -ArgumentList $args | Out-Null
