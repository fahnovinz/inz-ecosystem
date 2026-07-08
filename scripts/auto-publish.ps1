param(
    [string]$Username = "fahnovinz",
    [string]$RepoName = "claude-oss-kit",
    [int]$WaitMinutes = 10
)

$ErrorActionPreference = "Stop"

$paths = @(
    "C:\Program Files\GitHub CLI",
    "C:\Program Files\Git\cmd",
    "C:\Program Files\Git\bin"
)

foreach ($p in $paths) {
    if (Test-Path $p) { $env:Path = "$p;$env:Path" }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

function Test-GhAuth {
    gh auth status 2>$null
    return $LASTEXITCODE -eq 0
}

Write-Host ""
Write-Host "=== Auto Publish ke GitHub ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-GhAuth)) {
    Write-Host "Belum login GitHub. Membuka browser..." -ForegroundColor Yellow
    Start-Process "https://github.com/login/device"
    Write-Host ""
    Write-Host "Jalankan di terminal lain (jika perlu):" -ForegroundColor Yellow
    Write-Host "  gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow" -ForegroundColor White
    Write-Host ""
    Write-Host "Menunggu login (max $WaitMinutes menit)..." -ForegroundColor Yellow

    $deadline = (Get-Date).AddMinutes($WaitMinutes)
    while ((Get-Date) -lt $deadline) {
        if (Test-GhAuth) {
            Write-Host "Login berhasil!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 5
    }

    if (-not (Test-GhAuth)) {
        Write-Host "Login belum selesai. Ulangi: .\scripts\auto-publish.ps1" -ForegroundColor Red
        exit 1
    }
}

$remoteUrl = "https://github.com/$Username/$RepoName.git"

$hasOrigin = $false
try {
    $null = git remote get-url origin 2>$null
    $hasOrigin = $LASTEXITCODE -eq 0
} catch {
    $hasOrigin = $false
}

if (-not $hasOrigin) {
    git remote add origin $remoteUrl
}

Write-Host "Membuat repo dan push..." -ForegroundColor Yellow

gh repo create "$Username/$RepoName" `
    --public `
    --source . `
    --remote origin `
    --push `
    --description "Open-source toolkit to verify Claude for OSS eligibility and prepare your application"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Repo mungkin sudah ada, push manual..." -ForegroundColor Yellow
    git push -u origin main
}

Write-Host ""
Write-Host "Berhasil! https://github.com/$Username/$RepoName" -ForegroundColor Green
Write-Host "Draft aplikasi: docs/APLIKASI_FAHNOVINZ.md"
Write-Host ""