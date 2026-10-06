@echo off
setlocal EnableExtensions
chcp 65001 >nul
title SiasCloud ERP - Escritorio Windows
cd /d "%~dp0"

rem ============================================================
rem SiasCloud ERP - Lanzador de escritorio Windows
rem No requiere Node, Electron ni instalacion adicional.
rem Usa el motor Chromium de Microsoft Edge/Chrome en modo APP.
rem El servidor local solo escucha en 127.0.0.1 (este equipo).
rem ============================================================

if not exist "%~dp0index.html" (
  echo [ERROR] No se encontro index.html junto a este BAT.
  echo Extrae el BAT dentro de la carpeta completa de SiasCloud ERP.
  pause
  exit /b 1
)

set "PORT=18891"
set "SIASCLOUD_ROOT=%~dp0"
set "SIASCLOUD_PORT=%PORT%"
set "PROFILE=%LOCALAPPDATA%\SiasCloudERP\DesktopProfile"

set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if not defined BROWSER (
  echo [ERROR] SiasCloud Escritorio necesita Microsoft Edge o Google Chrome.
  echo Windows 10/11 normalmente ya incluye Microsoft Edge.
  pause
  exit /b 2
)

rem Crear acceso directo en el Escritorio la primera vez.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop');$lnk=Join-Path $d 'SiasCloud ERP Escritorio.lnk';if(!(Test-Path $lnk)){$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut($lnk);$s.TargetPath='%~f0';$s.WorkingDirectory='%~dp0';$s.Description='SiasCloud ERP - Version Escritorio';$s.Save()}" >nul 2>&1

rem Comprobar si el servidor local de SiasCloud ya esta activo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try{$r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:%PORT%/index.html' -TimeoutSec 1;if($r.Headers['X-SiasCloud-Desktop'] -eq '1'){exit 0}else{exit 1}}catch{exit 1}" >nul 2>&1
if errorlevel 1 (
  start "SiasCloud Local" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand JAByAG8AbwB0AD0AWwBJAE8ALgBQAGEAdABoAF0AOgA6AEcAZQB0AEYAdQBsAGwAUABhAHQAaAAoACQAZQBuAHYAOgBTAEkAQQBTAEMATABPAFUARABfAFIATwBPAFQAKQA7ACQAcABvAHIAdAA9AFsAaQBuAHQAXQAkAGUAbgB2ADoAUwBJAEEAUwBDAEwATwBVAEQAXwBQAE8AUgBUADsAJABsAD0AWwBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAGMAcABMAGkAcwB0AGUAbgBlAHIAXQA6ADoAbgBlAHcAKABbAE4AZQB0AC4ASQBQAEEAZABkAHIAZQBzAHMAXQA6ADoATABvAG8AcABiAGEAYwBrACwAJABwAG8AcgB0ACkAOwB0AHIAeQB7ACQAbAAuAFMAdABhAHIAdAAoACkAfQBjAGEAdABjAGgAewBlAHgAaQB0AH0AOwB3AGgAaQBsAGUAKAAkAHQAcgB1AGUAKQB7ACQAYwA9ACQAbAAuAEEAYwBjAGUAcAB0AFQAYwBwAEMAbABpAGUAbgB0ACgAKQA7AHQAcgB5AHsAJABzAD0AJABjAC4ARwBlAHQAUwB0AHIAZQBhAG0AKAApADsAJAByAD0AWwBJAE8ALgBTAHQAcgBlAGEAbQBSAGUAYQBkAGUAcgBdADoAOgBuAGUAdwAoACQAcwApADsAJABsAGkAbgBlAD0AJAByAC4AUgBlAGEAZABMAGkAbgBlACgAKQA7AGkAZgAoACEAJABsAGkAbgBlACkAewAkAGMALgBDAGwAbwBzAGUAKAApADsAYwBvAG4AdABpAG4AdQBlAH0AOwAkAHAAYQByAHQAcwA9ACQAbABpAG4AZQAuAFMAcABsAGkAdAAoACcAIAAnACkAOwAkAHUAPQBbAFUAcgBpAF0AOgA6AFUAbgBlAHMAYwBhAHAAZQBEAGEAdABhAFMAdAByAGkAbgBnACgAKAAkAHAAYQByAHQAcwBbADEAXQAtAHMAcABsAGkAdAAgACcAXAA/ACcAKQBbADAAXQApADsAdwBoAGkAbABlACgAKAAkAGgAPQAkAHIALgBSAGUAYQBkAEwAaQBuAGUAKAApACkAIAAtAG4AZQAgACcAJwApAHsAfQA7ACQAcgBlAGwAPQAkAHUALgBUAHIAaQBtAFMAdABhAHIAdAAoACcALwAnACkALgBSAGUAcABsAGEAYwBlACgAJwAvACcALAAnAFwAJwApADsAaQBmACgAWwBzAHQAcgBpAG4AZwBdADoAOgBJAHMATgB1AGwAbABPAHIAVwBoAGkAdABlAFMAcABhAGMAZQAoACQAcgBlAGwAKQApAHsAJAByAGUAbAA9ACcAaQBuAGQAZQB4AC4AaAB0AG0AbAAnAH0AOwAkAHAAPQBbAEkATwAuAFAAYQB0AGgAXQA6ADoARwBlAHQARgB1AGwAbABQAGEAdABoACgAWwBJAE8ALgBQAGEAdABoAF0AOgA6AEMAbwBtAGIAaQBuAGUAKAAkAHIAbwBvAHQALAAkAHIAZQBsACkAKQA7AGkAZgAoACEAJABwAC4AUwB0AGEAcgB0AHMAVwBpAHQAaAAoACQAcgBvAG8AdAAsAFsAUwB0AHIAaQBuAGcAQwBvAG0AcABhAHIAaQBzAG8AbgBdADoAOgBPAHIAZABpAG4AYQBsAEkAZwBuAG8AcgBlAEMAYQBzAGUAKQAtAG8AcgAhACgAVABlAHMAdAAtAFAAYQB0AGgAIAAtAEwAaQB0AGUAcgBhAGwAUABhAHQAaAAgACQAcAAgAC0AUABhAHQAaABUAHkAcABlACAATABlAGEAZgApACkAewAkAGIAPQBbAFQAZQB4AHQALgBFAG4AYwBvAGQAaQBuAGcAXQA6ADoAVQBUAEYAOAAuAEcAZQB0AEIAeQB0AGUAcwAoACcANAAwADQAJwApADsAJABzAHQAYQB0AHUAcwA9ACcANAAwADQAIABOAG8AdAAgAEYAbwB1AG4AZAAnADsAJABjAHQAPQAnAHQAZQB4AHQALwBwAGwAYQBpAG4AOwAgAGMAaABhAHIAcwBlAHQAPQB1AHQAZgAtADgAJwB9AGUAbABzAGUAewAkAGIAPQBbAEkATwAuAEYAaQBsAGUAXQA6ADoAUgBlAGEAZABBAGwAbABCAHkAdABlAHMAKAAkAHAAKQA7AHMAdwBpAHQAYwBoACgAWwBJAE8ALgBQAGEAdABoAF0AOgA6AEcAZQB0AEUAeAB0AGUAbgBzAGkAbwBuACgAJABwACkALgBUAG8ATABvAHcAZQByACgAKQApAHsAJwAuAGgAdABtAGwAJwB7ACQAYwB0AD0AJwB0AGUAeAB0AC8AaAB0AG0AbAA7ACAAYwBoAGEAcgBzAGUAdAA9AHUAdABmAC0AOAAnAH0AJwAuAGoAcwAnAHsAJABjAHQAPQAnAGEAcABwAGwAaQBjAGEAdABpAG8AbgAvAGoAYQB2AGEAcwBjAHIAaQBwAHQAOwAgAGMAaABhAHIAcwBlAHQAPQB1AHQAZgAtADgAJwB9ACcALgBjAHMAcwAnAHsAJABjAHQAPQAnAHQAZQB4AHQALwBjAHMAcwA7ACAAYwBoAGEAcgBzAGUAdAA9AHUAdABmAC0AOAAnAH0AJwAuAGoAcwBvAG4AJwB7ACQAYwB0AD0AJwBhAHAAcABsAGkAYwBhAHQAaQBvAG4ALwBqAHMAbwBuADsAIABjAGgAYQByAHMAZQB0AD0AdQB0AGYALQA4ACcAfQAnAC4AcABuAGcAJwB7ACQAYwB0AD0AJwBpAG0AYQBnAGUALwBwAG4AZwAnAH0AJwAuAGoAcABnACcAewAkAGMAdAA9ACcAaQBtAGEAZwBlAC8AagBwAGUAZwAnAH0AJwAuAGoAcABlAGcAJwB7ACQAYwB0AD0AJwBpAG0AYQBnAGUALwBqAHAAZQBnACcAfQAnAC4AcwB2AGcAJwB7ACQAYwB0AD0AJwBpAG0AYQBnAGUALwBzAHYAZwArAHgAbQBsACcAfQAnAC4AaQBjAG8AJwB7ACQAYwB0AD0AJwBpAG0AYQBnAGUALwB4AC0AaQBjAG8AbgAnAH0AJwAuAHcAZQBiAHAAJwB7ACQAYwB0AD0AJwBpAG0AYQBnAGUALwB3AGUAYgBwACcAfQAnAC4AdwBvAGYAZgAnAHsAJABjAHQAPQAnAGYAbwBuAHQALwB3AG8AZgBmACcAfQAnAC4AdwBvAGYAZgAyACcAewAkAGMAdAA9ACcAZgBvAG4AdAAvAHcAbwBmAGYAMgAnAH0AJwAuAHgAbABzAHgAJwB7ACQAYwB0AD0AJwBhAHAAcABsAGkAYwBhAHQAaQBvAG4ALwB2AG4AZAAuAG8AcABlAG4AeABtAGwAZgBvAHIAbQBhAHQAcwAtAG8AZgBmAGkAYwBlAGQAbwBjAHUAbQBlAG4AdAAuAHMAcAByAGUAYQBkAHMAaABlAGUAdABtAGwALgBzAGgAZQBlAHQAJwB9ACcALgBjAHMAdgAnAHsAJABjAHQAPQAnAHQAZQB4AHQALwBjAHMAdgA7ACAAYwBoAGEAcgBzAGUAdAA9AHUAdABmAC0AOAAnAH0AZABlAGYAYQB1AGwAdAB7ACQAYwB0AD0AJwBhAHAAcABsAGkAYwBhAHQAaQBvAG4ALwBvAGMAdABlAHQALQBzAHQAcgBlAGEAbQAnAH0AfQA7ACQAcwB0AGEAdAB1AHMAPQAnADIAMAAwACAATwBLACcAfQA7ACQAaABlAGEAZAA9ACIASABUAFQAUAAvADEALgAxACAAJABzAHQAYQB0AHUAcwBgAHIAYABuAEMAbwBuAHQAZQBuAHQALQBUAHkAcABlADoAIAAkAGMAdABgAHIAYABuAEMAbwBuAHQAZQBuAHQALQBMAGUAbgBnAHQAaAA6ACAAJAAoACQAYgAuAEwAZQBuAGcAdABoACkAYAByAGAAbgBDAGEAYwBoAGUALQBDAG8AbgB0AHIAbwBsADoAIABuAG8ALQBzAHQAbwByAGUALAAgAG4AbwAtAGMAYQBjAGgAZQAsACAAbQB1AHMAdAAtAHIAZQB2AGEAbABpAGQAYQB0AGUAYAByAGAAbgBQAHIAYQBnAG0AYQA6ACAAbgBvAC0AYwBhAGMAaABlAGAAcgBgAG4AQwBvAG4AbgBlAGMAdABpAG8AbgA6ACAAYwBsAG8AcwBlAGAAcgBgAG4AWAAtAFMAaQBhAHMAQwBsAG8AdQBkAC0ARABlAHMAawB0AG8AcAA6ACAAMQBgAHIAYABuAGAAcgBgAG4AIgA7ACQAaABiAD0AWwBUAGUAeAB0AC4ARQBuAGMAbwBkAGkAbgBnAF0AOgA6AEEAUwBDAEkASQAuAEcAZQB0AEIAeQB0AGUAcwAoACQAaABlAGEAZAApADsAJABzAC4AVwByAGkAdABlACgAJABoAGIALAAwACwAJABoAGIALgBMAGUAbgBnAHQAaAApADsAJABzAC4AVwByAGkAdABlACgAJABiACwAMAAsACQAYgAuAEwAZQBuAGcAdABoACkAfQBjAGEAdABjAGgAewB9AGYAaQBuAGEAbABsAHkAewAkAGMALgBDAGwAbwBzAGUAKAApAH0AfQA=
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false;for($i=0;$i -lt 30;$i++){try{$r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:%PORT%/index.html' -TimeoutSec 1;if($r.StatusCode -eq 200){$ok=$true;break}}catch{};Start-Sleep -Milliseconds 100};if($ok){exit 0}else{exit 1}" >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] No se pudo iniciar el servidor local de SiasCloud.
    pause
    exit /b 3
  )
)

if not exist "%PROFILE%" mkdir "%PROFILE%" >nul 2>&1

rem --kiosk-printing permite impresion directa a la impresora predeterminada
rem cuando SiasCloud invoca window.print(), evitando pasos innecesarios.
start "SiasCloud ERP" "%BROWSER%" --app="http://127.0.0.1:%PORT%/index.html" --user-data-dir="%PROFILE%" --start-maximized --kiosk-printing --no-first-run --disable-background-mode --disable-features=TranslateUI

exit /b 0
