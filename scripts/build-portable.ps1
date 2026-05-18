# ────────────────────────────────────────────────────────────────
#  build-portable.ps1 — Assemble portable Windows x64 ZIP
#
#  Usage:  powershell -ExecutionPolicy Bypass -File scripts\build-portable.ps1
#  Output: discord-music-bot-portable-win-x64.zip
# ────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

# ── Config ────────────────────────────────────────────────────
$NodeVersion   = "22.15.0"
$FfmpegVersion = "7.1.1"
$YtdlpVersion  = "2025.03.31"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$RepoRoot\package.json")) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path "$RepoRoot\package.json")) { $RepoRoot = Get-Location }
$BuildDir = Join-Path $RepoRoot ".portable-build"
$OutDir   = Join-Path $BuildDir "discord-music-bot"
$ZipName  = "discord-music-bot-portable-win-x64.zip"

Write-Host "════════════════════════════════════════════════════════════"
Write-Host "  Discord Music Bot — Portable Windows x64 Build"
Write-Host "════════════════════════════════════════════════════════════"
Write-Host ""

# ── Clean ─────────────────────────────────────────────────────
Write-Host "[1/8] Cleaning previous build..."
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Path "$OutDir\runtime" -Force | Out-Null
New-Item -ItemType Directory -Path "$OutDir\bin"     -Force | Out-Null
New-Item -ItemType Directory -Path "$OutDir\data"    -Force | Out-Null
New-Item -ItemType Directory -Path "$OutDir\logs"    -Force | Out-Null

# ── Install & Build ──────────────────────────────────────────
Write-Host "[2/8] Installing dependencies..."
Push-Location $RepoRoot
npm ci
Write-Host "[3/8] Generating Prisma client..."
npx prisma generate
Write-Host "[4/8] Building TypeScript..."
npm run build
Pop-Location

# ── Copy production files ─────────────────────────────────────
Write-Host "[5/8] Assembling production files..."
Copy-Item "$RepoRoot\dist"   "$OutDir\dist"   -Recurse
Copy-Item "$RepoRoot\prisma" "$OutDir\prisma" -Recurse
# Patch schema.prisma to generate Windows Prisma engine
$schema = Join-Path "$OutDir\prisma" "schema.prisma"
(Get-Content $schema -Raw) -replace 'provider = "prisma-client-js"', "provider = `"prisma-client-js`"`n  binaryTargets = [`"windows`"]" | Set-Content $schema -NoNewline
Copy-Item "$RepoRoot\package.json"     "$OutDir\"
Copy-Item "$RepoRoot\package-lock.json" "$OutDir\"

Push-Location $OutDir
npm ci --omit=dev --ignore-scripts
npx prisma generate
Pop-Location

Copy-Item "$RepoRoot\portable\start.bat"            "$OutDir\"
Copy-Item "$RepoRoot\portable\stop.bat"              "$OutDir\"
Copy-Item "$RepoRoot\portable\install-commands.bat"  "$OutDir\"
Copy-Item "$RepoRoot\portable\README.txt"            "$OutDir\"
Copy-Item "$RepoRoot\.env.example"                   "$OutDir\"
if (Test-Path "$RepoRoot\LICENSE") { Copy-Item "$RepoRoot\LICENSE" "$OutDir\" }

# ── Node.js ───────────────────────────────────────────────────
Write-Host "[6/8] Downloading Node.js v${NodeVersion} (win-x64)..."
$nodeUrl  = "https://nodejs.org/dist/v${NodeVersion}/node-v${NodeVersion}-win-x64.zip"
$nodeZip  = Join-Path $BuildDir "node.zip"
Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
Expand-Archive -Path $nodeZip -DestinationPath "$BuildDir\node-extract"
Move-Item "$BuildDir\node-extract\node-v${NodeVersion}-win-x64" "$OutDir\runtime\node"
Remove-Item $nodeZip -Force
Remove-Item "$BuildDir\node-extract" -Recurse -Force

# Strip docs from Node
@("share","include","BUILDING.md","CONTRIBUTING.md","GOVERNANCE.md","SECURITY.md","doc") | ForEach-Object {
    $p = Join-Path "$OutDir\runtime\node" $_
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# ── ffmpeg ────────────────────────────────────────────────────
Write-Host "[7/8] Downloading ffmpeg ${FfmpegVersion} (win64)..."
$ffmpegUrls = @(
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n${FfmpegVersion}-latest-win64-gpl-${FfmpegVersion}.zip",
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
    "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
)
$ffmpegZip = Join-Path $BuildDir "ffmpeg.zip"
$downloaded = $false
foreach ($url in $ffmpegUrls) {
    Write-Host "   Trying: $url"
    try {
        Invoke-WebRequest -Uri $url -OutFile $ffmpegZip -UseBasicParsing -TimeoutSec 60
        $downloaded = $true
        Write-Host "   OK"
        break
    } catch {
        Write-Host "   Failed, trying next..."
    }
}
if ($downloaded) {
    Expand-Archive -Path $ffmpegZip -DestinationPath "$BuildDir\ffmpeg-extract"
    $exe = Get-ChildItem "$BuildDir\ffmpeg-extract" -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
    if ($exe) { Copy-Item $exe.FullName "$OutDir\bin\ffmpeg.exe" }
    Remove-Item $ffmpegZip -Force
    Remove-Item "$BuildDir\ffmpeg-extract" -Recurse -Force
} else {
    Write-Host "   [WARN] Could not download ffmpeg. Place ffmpeg.exe in bin\ manually."
}

# ── yt-dlp ────────────────────────────────────────────────────
Write-Host "[8/8] Downloading yt-dlp ${YtdlpVersion}..."
$ytdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/download/${YtdlpVersion}/yt-dlp.exe"
try {
    Invoke-WebRequest -Uri $ytdlpUrl -OutFile "$OutDir\bin\yt-dlp.exe" -UseBasicParsing
} catch {
    Write-Host "   Trying latest release..."
    try {
        Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
            -OutFile "$OutDir\bin\yt-dlp.exe" -UseBasicParsing
    } catch {
        Write-Host "   [WARN] Could not download yt-dlp. Place yt-dlp.exe in bin\ manually."
    }
}

# ── ZIP ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "Packaging ZIP..."
$zipPath = Join-Path $RepoRoot $ZipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$OutDir" -DestinationPath $zipPath -CompressionLevel Optimal

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════"
Write-Host "  BUILD COMPLETE"
Write-Host ""
Write-Host "  Output:  $ZipName"
Write-Host ("  Size:    {0:N1} MB" -f $zipSize)
Write-Host ""
Write-Host "  Structure:"
Write-Host "    discord-music-bot/"
Write-Host "    ├── start.bat"
Write-Host "    ├── stop.bat"
Write-Host "    ├── install-commands.bat"
Write-Host "    ├── .env.example"
Write-Host "    ├── README.txt"
Write-Host "    ├── dist/              (production build)"
Write-Host "    ├── node_modules/      (production deps only)"
Write-Host "    ├── prisma/"
Write-Host "    ├── runtime/"
Write-Host "    │   └── node/          (Node.js v${NodeVersion})"
Write-Host "    ├── bin/"
Write-Host "    │   ├── ffmpeg.exe"
Write-Host "    │   └── yt-dlp.exe"
Write-Host "    ├── data/"
Write-Host "    └── logs/"
Write-Host "════════════════════════════════════════════════════════════"
