@echo off
title Install Slash Commands
setlocal enabledelayedexpansion

set "BOT_DIR=%~dp0"
cd /d "%BOT_DIR%"

:: -- Check .env --
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo   Copy .env.example to .env and fill in your tokens first.
    pause
    exit /b 1
)

:: -- Set portable paths --
set "PATH=%BOT_DIR%runtime\node;%BOT_DIR%bin;%PATH%"
set "NODE_ENV=production"

:: -- Generate Prisma client for current platform (first run) --
if not exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
    echo [CMD] Generating Prisma client for Windows (first run)...
    "%BOT_DIR%runtime\node\npx.cmd" prisma generate 2>>logs\error.log
)

:: -- Register slash commands --
echo [CMD] Registering slash commands with Discord API...
echo.

"%BOT_DIR%runtime\node\node.exe" dist/deploy-commands.js

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to register commands. Check your DISCORD_TOKEN and CLIENT_ID in .env
    pause
    exit /b 1
)

echo.
echo [CMD] Slash commands registered successfully!
echo.
echo   If you set DEV_GUILD_ID in .env, commands are available instantly in that server.
echo   If DEV_GUILD_ID is empty, global commands may take up to 1 hour to propagate.
echo.

endlocal
pause
