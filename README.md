# Discord Music Bot

Production-ready Discord music bot built with **discord.js v14**, **TypeScript**, **Prisma**, **yt-dlp** and **@discordjs/voice**. Plays from YouTube, Spotify, SoundCloud, direct URLs, and arbitrary search queries — no Lavalink required.

---

## Features

- **Slash commands**: `/play`, `/skip`, `/stop`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/shuffle`, `/loop`, `/remove`, `/clear`, `/volume`, `/seek`, `/lyrics`
- **Playlists**: `/playlist create|add|remove|list|play|delete`
- **Admin**: `/settings`, `/247`, `/autoplay`, `/restrict`, `/djrole`
- **Info**: `/ping`, `/help`, `/stats`
- **Multi-guild**: independent queue/player per server
- **Sources**: YouTube videos & playlists, Spotify tracks/playlists/albums (resolved through YouTube), SoundCloud tracks/playlists, any HTTP audio URL, livestreams
- **Modern UI**: progress bars, thumbnails, action buttons (pause/skip/stop/shuffle/loop/volume/favorite) and select menus for search
- **Reliability**: auto-reconnect to voice, anti-crash safety nets, retry on stream failure, idle disconnect with 24/7 override
- **Smart**: autoplay similar tracks when the queue ends, vote skip, DJ role + per-channel restriction, per-guild settings persisted in DB
- **Performance**: streaming via yt-dlp → ffmpeg pipe, opus-friendly bitrates, in-memory cooldown/rate-limit guards
- **Production**: Dockerfile, docker-compose, PM2 ecosystem, GitHub Actions CI, full eslint/prettier/typescript strict

---

## Stack

| Layer          | Choice                                                      |
| -------------- | ----------------------------------------------------------- |
| Runtime        | Node.js ≥ 20                                                |
| Language       | TypeScript (strict mode)                                    |
| Discord        | `discord.js@^14.16`, `@discordjs/voice@^0.18`               |
| Audio fetch    | `yt-dlp` (Python binary, spawned)                           |
| Audio transcode| `ffmpeg` (system binary, falls back to `ffmpeg-static`)     |
| Encryption     | `sodium-native` + `libsodium-wrappers` (voice opus)         |
| Persistence    | Prisma + **SQLite by default** (swap to PostgreSQL in 2 lines) |
| Logging        | `pino` (pretty in dev, JSON in prod)                        |
| Validation     | `zod` for `.env`                                            |
| Process mgr    | PM2 (optional)                                              |
| Container      | Docker + docker-compose                                     |

---

## Quick start (local)

### 1. Prerequisites

You need three binaries on your machine:

- **Node.js ≥ 20** — [nodejs.org](https://nodejs.org/) or via [nvm](https://github.com/nvm-sh/nvm)
- **ffmpeg** — for audio transcoding
- **yt-dlp** — for source resolution and streaming

#### Install ffmpeg

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install -y ffmpeg

# macOS
brew install ffmpeg

# Windows (winget)
winget install Gyan.FFmpeg
```

#### Install yt-dlp

```bash
# Debian / Ubuntu (recommended — pip user install)
sudo apt install -y python3-pip
pip install --user --upgrade yt-dlp
# Make sure ~/.local/bin is on your $PATH

# macOS
brew install yt-dlp

# Windows
winget install yt-dlp.yt-dlp
```

### 2. Clone and install

```bash
git clone https://github.com/kr3ch/discord-music-bot.git
cd discord-music-bot
npm install
cp .env.example .env
# Edit .env — at minimum DISCORD_TOKEN and CLIENT_ID
```

### 3. Get your Discord bot token

1. Go to https://discord.com/developers/applications.
2. **New Application** → name it.
3. In the left sidebar open **Bot** → **Reset Token** → copy → paste into `.env` as `DISCORD_TOKEN`.
4. On the same page enable **Server Members Intent** *(optional — only needed for advanced features)*. The default intents work for music.
5. In the left sidebar open **OAuth2** → **General** → copy the **Application ID** → paste as `CLIENT_ID`.

### 4. Invite the bot to your server

Build the invite URL using the official link generator:

1. **OAuth2** → **URL Generator**.
2. Scopes: `bot`, `applications.commands`.
3. Bot permissions: `View Channels`, `Send Messages`, `Embed Links`, `Connect`, `Speak`, `Use Voice Activity`.
4. Open the generated URL in your browser and pick a server.

Or use this minimal template — replace `YOUR_CLIENT_ID`:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3148800&scope=bot%20applications.commands
```

### 5. Initialise the database and register commands

```bash
# Generate Prisma client and create the SQLite file
npm run prisma:migrate -- --name init   # first time only
# (alternatively: npm run db:push for fast prototyping)

# Register slash commands
# If DEV_GUILD_ID is set in .env  → instantaneous on that one guild
# If not                          → globally (takes up to 1 hour)
npm run deploy:commands
```

### 6. Run

```bash
# Dev (auto-reload via tsx)
npm run dev

# Production
npm run build
npm start
```

Then in Discord:

```
/play never gonna give you up
/play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
/play https://soundcloud.com/artist/track
/queue
/skip
```

---

## Switching to PostgreSQL

SQLite is the default and is perfectly fine up to thousands of guilds. To switch to Postgres:

1. Change `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`.
2. Update `DATABASE_URL` in `.env`, e.g. `postgresql://musicbot:musicbot@localhost:5432/musicbot`.
3. Uncomment the `db:` service in `docker-compose.yml` (or run Postgres separately).
4. Run `npm run prisma:migrate -- --name init`.

That's it. Everything else stays the same.

---

## Docker

```bash
# Build & run
docker compose up -d --build

# Logs
docker compose logs -f bot

# Stop
docker compose down
```

The container ships ffmpeg, yt-dlp, and the Node runtime — no host dependencies needed. The SQLite file lives in `./data/bot.db` (mounted volume).

On first run inside Docker, the entrypoint runs `prisma migrate deploy` and starts the bot. After changing the schema, rebuild with `docker compose up -d --build`.

---

## Deploy to a VPS

### Option A: PM2 (recommended for small VPSes)

```bash
# 1. SSH into the VPS, install Node 22, ffmpeg, yt-dlp (see Prerequisites).
# 2. Install pm2 globally
sudo npm install -g pm2

# 3. Clone & set up
git clone https://github.com/kr3ch/discord-music-bot.git
cd discord-music-bot
npm ci
cp .env.example .env && nano .env   # fill in tokens
npm run prisma:migrate -- --name init
npm run deploy:commands
npm run build

# 4. Start under pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup           # follow the printed command to enable auto-start at boot
pm2 logs              # tail logs
```

Updates:

```bash
git pull && npm ci && npm run build && pm2 restart discord-music-bot
```

### Option B: Docker on a VPS

```bash
# Install docker via the official one-liner
curl -fsSL https://get.docker.com | sh

# Clone and run
git clone https://github.com/kr3ch/discord-music-bot.git
cd discord-music-bot
cp .env.example .env && nano .env
docker compose up -d --build
```

### Option C: systemd

```bash
sudo tee /etc/systemd/system/musicbot.service >/dev/null <<'EOF'
[Unit]
Description=Discord Music Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/discord-music-bot
EnvironmentFile=/opt/discord-music-bot/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
User=musicbot

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now musicbot
journalctl -u musicbot -f
```

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Required:

- `DISCORD_TOKEN` — bot token from the Discord Developer Portal.
- `CLIENT_ID` — application ID (same place).

Optional but useful:

- `DEV_GUILD_ID` — guild for instant slash-command registration during development.
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — required only to resolve Spotify URLs ([create app](https://developer.spotify.com/dashboard)).
- `GENIUS_TOKEN` — better lyrics; otherwise the bot falls back to lyrics.ovh (free, no key).
- `DATABASE_URL` — defaults to `file:./data/bot.db`.
- `LEAVE_ON_EMPTY_TIMEOUT` — seconds to wait alone in voice before leaving (default 60, set 0 to disable).
- `MAX_QUEUE_SIZE`, `QUEUE_PAGE_SIZE`, `LOG_LEVEL`, `DEFAULT_COOLDOWN_MS`, `YTDLP_PATH`, `FFMPEG_PATH`.

---

## Architecture

```
src/
├── client.ts                   # extended discord.js Client (+ commands, music manager)
├── index.ts                    # bootstrap, graceful shutdown
├── deploy-commands.ts          # REST API: register slash commands
├── config/
│   ├── env.ts                  # zod-validated env
│   └── constants.ts            # colors, emojis, button ids
├── database/
│   └── prisma.ts               # PrismaClient singleton + connect/disconnect
├── types/
│   ├── command.ts              # Command interface
│   ├── event.ts                # BotEvent interface
│   └── track.ts                # TrackInfo, SearchResult, LoopMode
├── utils/
│   ├── logger.ts               # pino logger factory
│   ├── time.ts                 # duration formatters
│   ├── progressBar.ts          # ASCII progress bar
│   ├── embeds.ts               # embed factories
│   ├── components.ts           # ActionRows / buttons / select menus
│   ├── permissions.ts          # DJ / restrict / settings helpers
│   ├── voice.ts                # voice-state helpers
│   ├── cooldown.ts             # per-user per-command cooldowns
│   ├── rateLimiter.ts          # anti-spam (per-user actions/window)
│   └── errors.ts               # BotError / MusicError / SourceError
├── music/
│   ├── Queue.ts                # in-memory queue with loop modes
│   ├── Player.ts               # per-guild AudioPlayer + VoiceConnection
│   ├── MusicManager.ts         # Player registry
│   ├── stream.ts               # yt-dlp → ffmpeg piped stream factory
│   └── sources/
│       ├── index.ts            # router: URL → resolver
│       ├── youtube.ts          # yt-dlp resolve/search/stream
│       ├── spotify.ts          # Spotify Web API → YT search
│       ├── soundcloud.ts       # yt-dlp (SC support is built-in)
│       └── http.ts             # direct audio URLs
├── handlers/
│   ├── commandHandler.ts       # recursive command loader
│   ├── eventHandler.ts         # event loader
│   ├── buttonHandler.ts        # player control buttons
│   └── selectMenuHandler.ts    # search results select menu
├── events/
│   ├── ready.ts                # presence
│   ├── interactionCreate.ts    # dispatch → command / button / select
│   ├── voiceStateUpdate.ts     # auto-leave when alone
│   └── error.ts                # client-level error logger
└── commands/
    ├── music/                  # /play, /skip, /stop, …
    ├── playlist/               # /playlist <sub>
    ├── admin/                  # /settings, /247, …
    └── info/                   # /ping, /help, /stats
```

### Audio pipeline

```
 query  →  source resolver (URL / search)  →  TrackInfo
                                                 │
                                                 ▼
                                  yt-dlp -o - <url>     (for YT / SC / Spotify-via-YT)
                                          │
                                          ▼ stdout (raw audio bytes)
                                  ffmpeg -i pipe:0 -f s16le -ar 48000 -ac 2 pipe:1
                                          │
                                          ▼ stdout (PCM s16le 48 kHz stereo)
                                  createAudioResource({ inputType: Raw, inlineVolume: true })
                                          │
                                          ▼
                                  AudioPlayer  ─►  VoiceConnection  ─►  Discord
```

For **direct HTTP URLs** the yt-dlp step is skipped (ffmpeg fetches the URL directly with reconnect flags), enabling seamless livestream playback. For **Spotify**, the bot calls the Web API for metadata and then resolves to a YouTube source (Spotify doesn't expose raw streams).

### Reliability features

- `entersState(VoiceConnectionStatus.Ready, 30s)` on connect.
- On `Disconnected`, races a 5 s window of `Signalling`/`Connecting` — if either fires, the connection is healing; otherwise we destroy & teardown.
- Each track start retries up to 3 times before being skipped.
- Idle-detection loop: when humans leave the voice channel, the bot schedules a `LEAVE_ON_EMPTY_TIMEOUT` self-destruct (unless 24/7 mode is on).
- `process.on('unhandledRejection')` & `'uncaughtException'` log instead of crashing.

---

## Commands cheat-sheet

```
/play <query>          play track / playlist / URL / search
/skip                  skip current (vote-skip if you're not DJ or requester)
/stop                  stop & clear queue (DJ)
/pause /resume         pause / resume
/queue [page]          paginated queue
/nowplaying            current track w/ progress bar + buttons
/shuffle               shuffle queue (DJ)
/loop <mode>           off | track | queue (DJ)
/remove <position>     remove by index (DJ)
/clear                 clear queue (DJ)
/volume <0-200>        per-track volume (DJ)
/seek <time>           seek to 1:23 or 90 (DJ)
/lyrics [song]         Genius (if token) → lyrics.ovh fallback

/playlist create <name>
/playlist add <name> <query>
/playlist remove <name> <position>
/playlist list [name]
/playlist play <name>
/playlist delete <name>

/settings              show guild settings
/247 mode <on|off>     stay in voice forever
/autoplay mode <on|off>autoplay similar tracks at end of queue
/djrole [role]         set DJ role (DJ-only commands gated by this)
/restrict [channel]    restrict music commands to one text channel

/ping                  latency
/help                  this menu
/stats                 servers / players / uptime / RAM
```

---

## Usage examples

```bash
# Search and play
/play lofi hip hop radio

# YouTube URL (video or playlist)
/play https://www.youtube.com/watch?v=dQw4w9WgXcQ
/play https://www.youtube.com/playlist?list=PL...

# Spotify
/play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
/play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
/play https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv

# SoundCloud
/play https://soundcloud.com/imaginedragons/believer

# Direct HTTP stream
/play https://stream.example.com/radio.mp3

# Livestream
/play https://www.youtube.com/watch?v=jfKfPfyJRdk    # lofi girl 24/7
```

---

## Development scripts

```bash
npm run dev               # tsx watch
npm run build             # tsc → dist/
npm start                 # node dist/index.js
npm run deploy:commands   # POST slash commands to Discord
npm run typecheck         # tsc --noEmit
npm run lint / lint:fix   # eslint
npm run format            # prettier
npm run prisma:studio     # GUI for the DB
```

---

## Troubleshooting

- **`yt-dlp: command not found`** — install it (see Prerequisites) or set `YTDLP_PATH=/full/path/to/yt-dlp` in `.env`.
- **Bot joins voice but no sound** — make sure ffmpeg is installed; check `ffmpeg -version`. If you're on a minimal container, install it via apt/apk.
- **"Server Members Intent" required** — you don't need it for music. Only privileged intents (Members, Presence, Message Content) need to be toggled in the Developer Portal *and* declared in the code; this bot uses none of them.
- **Slash commands don't appear** — re-run `npm run deploy:commands`. Global commands take up to 1 hour. For instant testing set `DEV_GUILD_ID` in `.env`.
- **Spotify links fail** — set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (free, takes 1 minute at [developer.spotify.com](https://developer.spotify.com/dashboard)).
- **High CPU** — make sure you're using `bestaudio[acodec=opus]/bestaudio/best` (already configured). If running 100+ guilds simultaneously, scale horizontally (sharding) — out of scope for this template.

---

## Contributing

PRs welcome. Conventions:

- TypeScript strict mode, eslint must pass.
- Commit message style: `area: short description` (e.g. `music: fix seek for livestreams`).
- Run `npm run lint && npm run typecheck && npm run build` before pushing.

---

## License

MIT — see [LICENSE](./LICENSE).
