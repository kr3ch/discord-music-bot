@echo off
title Install Slash Commands

set "BOT_DIR=%~dp0"
cd /d "%BOT_DIR%"

set "PATH=%BOT_DIR%runtime\node;%BOT_DIR%bin;%PATH%"
set "NODE_ENV=production"

echo [CMD] Registering slash commands with Discord API...

"%BOT_DIR%runtime\node\node.exe" dist\deploy-commands.js

echo.
echo Done.
pause
