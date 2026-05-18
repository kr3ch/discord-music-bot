╔══════════════════════════════════════════════════════════════╗
║           Discord Music Bot — Portable Windows x64          ║
╚══════════════════════════════════════════════════════════════╝

  Version:  1.0.0
  Runtime:  Node.js 22 (included)
  Requires: Windows 10/11 x64


═══ QUICK START ═══════════════════════════════════════════════

  1. Copy  .env.example  →  .env
  2. Open .env in Notepad and fill in:
       DISCORD_TOKEN  — your bot token
       CLIENT_ID      — your application client ID
  3. Run  install-commands.bat  (registers slash commands)
  4. Run  start.bat             (starts the bot)

  Done! The bot is now online in Discord.


═══ WHERE TO GET TOKENS ═══════════════════════════════════════

  1. Go to  https://discord.com/developers/applications
  2. Create a new application (or select existing)
  3. Bot → Token → Copy  →  paste as DISCORD_TOKEN
  4. OAuth2 → Client ID → Copy  →  paste as CLIENT_ID
  5. Bot → Enable these intents:
       ✓ Presence Intent
       ✓ Server Members Intent
       ✓ Message Content Intent
  6. OAuth2 → URL Generator:
       Scopes: bot, applications.commands
       Bot Permissions: Connect, Speak, Send Messages,
                        Embed Links, Use Slash Commands
     Copy the URL and open it to invite the bot.


═══ FILE STRUCTURE ════════════════════════════════════════════

  discord-music-bot/
  ├── start.bat              Start the bot
  ├── stop.bat               Stop the bot
  ├── install-commands.bat   Register slash commands
  ├── .env.example           Configuration template
  ├── .env                   Your configuration (create this)
  ├── README.txt             This file
  │
  ├── dist/                  Compiled bot code
  ├── node_modules/          Dependencies (production only)
  ├── prisma/                Database schema & migrations
  │
  ├── runtime/
  │   └── node/              Portable Node.js runtime
  │
  ├── bin/
  │   ├── ffmpeg.exe         Audio transcoder
  │   └── yt-dlp.exe         Media downloader
  │
  ├── data/                  Database files (auto-created)
  └── logs/                  Log files (auto-created)


═══ OPTIONAL CONFIGURATION ════════════════════════════════════

  Spotify support:
    Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
    Get credentials at: https://developer.spotify.com/dashboard

  Lyrics (Genius):
    Set GENIUS_TOKEN in .env
    Get token at: https://genius.com/api-clients
    Without it, the bot uses free lyrics.ovh as fallback.

  Guild-only commands (instant registration):
    Set DEV_GUILD_ID to your server ID in .env
    Then re-run install-commands.bat


═══ COMMANDS ══════════════════════════════════════════════════

  Music:     /play /skip /stop /pause /resume /queue
             /nowplaying /shuffle /loop /remove /clear
             /volume /seek /lyrics /search

  Playlists: /playlist create|add|remove|list|play|delete

  Admin:     /settings /247 /autoplay /restrict /djrole

  Info:      /ping /help /stats


═══ TROUBLESHOOTING ═══════════════════════════════════════════

  Bot won't start?
    → Check .env has valid DISCORD_TOKEN and CLIENT_ID
    → Check logs/ folder for error details
    → Make sure Windows Firewall allows outbound HTTPS

  No sound in voice channel?
    → Bot needs Connect + Speak permissions
    → Check that bin/ffmpeg.exe and bin/yt-dlp.exe exist
    → Try: bin\yt-dlp.exe --version
    → Try: bin\ffmpeg.exe -version

  Commands not showing?
    → Run install-commands.bat
    → Global commands can take up to 1 hour
    → Set DEV_GUILD_ID for instant testing

  "Cannot find module" error?
    → node_modules may be corrupted
    → Re-extract the ZIP or re-download

  Update yt-dlp:
    → Download latest from https://github.com/yt-dlp/yt-dlp/releases
    → Replace bin/yt-dlp.exe


═══ STOPPING THE BOT ══════════════════════════════════════════

  Option 1:  Run stop.bat
  Option 2:  Press Ctrl+C in the bot window
  Option 3:  Close the bot window


═══ LICENSE ════════════════════════════════════════════════════

  MIT License — see LICENSE file for details.

