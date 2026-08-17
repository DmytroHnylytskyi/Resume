@echo off
title Portfolio & Projects Launcher
echo ========================================================
echo  Starting all Resume & Portfolio Projects Locally
echo ========================================================
echo [1/4] Starting Aetheria (Hub) on http://localhost:3000
start "Aetheria Hub :3000" cmd /k "cd /d c:\Dev\Resume\Aetheria && npm run dev"

echo [2/4] Starting Forma-3D on http://localhost:3001
start "Forma-3D :3001" cmd /k "cd /d c:\Dev\Resume\Forma-3D\frontend && npm run dev -- -p 3001"

echo [3/4] Starting TerraScope on http://localhost:3002
start "TerraScope :3002" cmd /k "cd /d c:\Dev\Resume\TerraScope\frontend && npm run dev -- -p 3002"

echo [4/4] Starting Lumina on http://localhost:3003
start "Lumina :3003" cmd /k "cd /d c:\Dev\Resume\Lumina\frontend && npm run dev -- --port 3003"

echo ========================================================
echo  All 4 project dev servers have been launched!
echo  Main Hub: http://localhost:3000
echo ========================================================
