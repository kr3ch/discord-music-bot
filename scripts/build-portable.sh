#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  build-portable.sh — Assemble portable Windows x64 ZIP
#
#  Usage:  bash scripts/build-portable.sh
#  Output: discord-music-bot-portable-win-x64.zip
#
#  Prerequisites (host machine):
#    - Node.js >= 20  (npm)
#    - curl, unzip, zip (or 7z)
# ────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────
NODE_VERSION="22.15.0"
FFMPEG_VERSION="7.1.1"
YTDLP_VERSION="2025.03.31"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$REPO_ROOT/.portable-build"
OUT_DIR="$BUILD_DIR/discord-music-bot"
ZIP_NAME="discord-music-bot-portable-win-x64.zip"

NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n${FFMPEG_VERSION}-latest-win64-gpl-${FFMPEG_VERSION}.zip"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp.exe"

echo "════════════════════════════════════════════════════════════"
echo "  Discord Music Bot — Portable Windows x64 Build"
echo "════════════════════════════════════════════════════════════"
echo ""

# ── Clean previous build ──────────────────────────────────────
echo "[1/8] Cleaning previous build..."
rm -rf "$BUILD_DIR"
mkdir -p "$OUT_DIR"/{runtime,bin,data,logs}

# ── Install dependencies & build ──────────────────────────────
echo "[2/8] Installing dependencies..."
cd "$REPO_ROOT"
npm ci

echo "[3/8] Generating Prisma client..."
npx prisma generate

echo "[4/8] Building TypeScript..."
npm run build

# ── Copy production files ─────────────────────────────────────
echo "[5/8] Assembling production files..."

# dist/
cp -r "$REPO_ROOT/dist" "$OUT_DIR/dist"

# prisma/ — copy and patch schema for Windows binary target
cp -r "$REPO_ROOT/prisma" "$OUT_DIR/prisma"
sed -i 's/provider = "prisma-client-js"/provider = "prisma-client-js"\n  binaryTargets = ["native", "windows"]/' "$OUT_DIR/prisma/schema.prisma"

# Production node_modules (clean install)
cp "$REPO_ROOT/package.json" "$OUT_DIR/"
cp "$REPO_ROOT/package-lock.json" "$OUT_DIR/"
cd "$OUT_DIR"
npm ci --omit=dev --ignore-scripts
# Install prisma CLI so bat scripts can run `prisma generate` on Windows
npm install prisma --no-save 2>/dev/null
# Install Windows-specific native bindings (npm skips cross-platform optional deps)
npm install @snazzah/davey-win32-x64-msvc --no-save --force 2>/dev/null || true
# Generate Prisma client with Windows engine
npx prisma generate
cd "$REPO_ROOT"

# Portable scripts & docs
cp "$REPO_ROOT/portable/start.bat" "$OUT_DIR/"
cp "$REPO_ROOT/portable/stop.bat" "$OUT_DIR/"
cp "$REPO_ROOT/portable/install-commands.bat" "$OUT_DIR/"
cp "$REPO_ROOT/portable/README.txt" "$OUT_DIR/"
cp "$REPO_ROOT/.env.example" "$OUT_DIR/"
cp "$REPO_ROOT/LICENSE" "$OUT_DIR/" 2>/dev/null || true

# Ensure CRLF line endings for all Windows text files
if command -v unix2dos &>/dev/null; then
    unix2dos -q "$OUT_DIR"/*.bat "$OUT_DIR"/*.txt "$OUT_DIR"/.env.example 2>/dev/null || true
elif command -v sed &>/dev/null; then
    for f in "$OUT_DIR"/*.bat "$OUT_DIR"/*.txt "$OUT_DIR"/.env.example; do
        [ -f "$f" ] && sed -i 's/$/\r/' "$f"
    done
fi

# ── Download portable Node.js ─────────────────────────────────
echo "[6/8] Downloading Node.js v${NODE_VERSION} (win-x64)..."
TEMP_NODE="$BUILD_DIR/node.zip"
curl -fSL --retry 3 "$NODE_URL" -o "$TEMP_NODE"
unzip -q "$TEMP_NODE" -d "$BUILD_DIR/node-extract"
# Move contents of node-vXX-win-x64/ into runtime/node/
mv "$BUILD_DIR/node-extract/node-v${NODE_VERSION}-win-x64" "$OUT_DIR/runtime/node"
rm -rf "$TEMP_NODE" "$BUILD_DIR/node-extract"

# Strip unnecessary files from Node to reduce size
rm -rf "$OUT_DIR/runtime/node/share" \
       "$OUT_DIR/runtime/node/include" \
       "$OUT_DIR/runtime/node/BUILDING.md" \
       "$OUT_DIR/runtime/node/CONTRIBUTING.md" \
       "$OUT_DIR/runtime/node/GOVERNANCE.md" \
       "$OUT_DIR/runtime/node/SECURITY.md" \
       "$OUT_DIR/runtime/node/doc" 2>/dev/null || true

# ── Download ffmpeg ───────────────────────────────────────────
echo "[7/8] Downloading ffmpeg ${FFMPEG_VERSION} (win64)..."
TEMP_FFMPEG="$BUILD_DIR/ffmpeg.zip"

# Try primary URL, fall back to essentials build
FFMPEG_URLS=(
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n${FFMPEG_VERSION}-latest-win64-gpl-${FFMPEG_VERSION}.zip"
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
)

FFMPEG_DOWNLOADED=0
for URL in "${FFMPEG_URLS[@]}"; do
    echo "   Trying: $URL"
    if curl -fSL --retry 2 --connect-timeout 15 "$URL" -o "$TEMP_FFMPEG" 2>/dev/null; then
        FFMPEG_DOWNLOADED=1
        echo "   OK"
        break
    fi
    echo "   Failed, trying next..."
done

if [ "$FFMPEG_DOWNLOADED" -eq 1 ]; then
    unzip -q "$TEMP_FFMPEG" -d "$BUILD_DIR/ffmpeg-extract"
    # Find ffmpeg.exe regardless of directory structure
    FFMPEG_EXE=$(find "$BUILD_DIR/ffmpeg-extract" -name "ffmpeg.exe" -type f | head -1)
    if [ -n "$FFMPEG_EXE" ]; then
        cp "$FFMPEG_EXE" "$OUT_DIR/bin/ffmpeg.exe"
    else
        echo "   [WARN] ffmpeg.exe not found in archive"
    fi
    rm -rf "$TEMP_FFMPEG" "$BUILD_DIR/ffmpeg-extract"
else
    echo "   [WARN] Could not download ffmpeg. Place ffmpeg.exe in bin/ manually."
fi

# ── Download yt-dlp ───────────────────────────────────────────
echo "[8/8] Downloading yt-dlp ${YTDLP_VERSION}..."
curl -fSL --retry 3 "$YTDLP_URL" -o "$OUT_DIR/bin/yt-dlp.exe" || {
    # Fallback to latest
    echo "   Trying latest release..."
    curl -fSL --retry 3 "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" \
        -o "$OUT_DIR/bin/yt-dlp.exe" || echo "   [WARN] Could not download yt-dlp. Place yt-dlp.exe in bin/ manually."
}

# ── Create ZIP ────────────────────────────────────────────────
echo ""
echo "Packaging ZIP..."
cd "$BUILD_DIR"
if command -v zip &>/dev/null; then
    zip -r -9 "$REPO_ROOT/$ZIP_NAME" discord-music-bot/
elif command -v 7z &>/dev/null; then
    7z a -tzip -mx=9 "$REPO_ROOT/$ZIP_NAME" discord-music-bot/
else
    echo "[ERROR] Neither zip nor 7z found. Install one to create ZIP."
    exit 1
fi

# ── Summary ───────────────────────────────────────────────────
ZIP_SIZE=$(du -sh "$REPO_ROOT/$ZIP_NAME" | cut -f1)
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  BUILD COMPLETE"
echo ""
echo "  Output:  $ZIP_NAME"
echo "  Size:    $ZIP_SIZE"
echo ""
echo "  Structure:"
echo "    discord-music-bot/"
echo "    ├── start.bat"
echo "    ├── stop.bat"
echo "    ├── install-commands.bat"
echo "    ├── .env.example"
echo "    ├── README.txt"
echo "    ├── LICENSE"
echo "    ├── dist/              (production build)"
echo "    ├── node_modules/      (production deps only)"
echo "    ├── prisma/"
echo "    ├── runtime/"
echo "    │   └── node/          (Node.js v${NODE_VERSION})"
echo "    ├── bin/"
echo "    │   ├── ffmpeg.exe"
echo "    │   └── yt-dlp.exe"
echo "    ├── data/              (empty, for SQLite DB)"
echo "    └── logs/              (empty, for log files)"
echo "════════════════════════════════════════════════════════════"
