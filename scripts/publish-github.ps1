param(
    [string]$Username = "fahnovinz",
    [string]$RepoName = "claude-oss-kit"
)

$ErrorActionPreference = "Stop"

$gitPaths = @(
    "C:\Program Files\Git\cmd",
    "C:\Program Files\Git\bin",
    "C:\Program Files\GitHub CLI"
)

foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $env:Path = "$path;$env:Path"
    }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

Write-Host "=== Publish claude-oss-kit ke GitHub ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git belum terinstall. Install dari https://git-scm.com/download/win"
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI belum terinstall. Jalankan: winget install GitHub.cli"
}

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Login GitHub dulu..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
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

Write-Host "Membuat repo GitHub (jika belum ada)..." -ForegroundColor Yellow
gh repo create "$Username/$RepoName" --public --source . --remote origin --push --description "Open-source toolkit to verify Claude for OSS eligibility and prepare your application" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Repo mungkin sudah ada, push saja..." -ForegroundColor Yellow
    git push -u origin main
}

Write-Host ""
Write-Host "Selesai! Repo: https://github.com/$Username/$RepoName" -ForegroundColor Green
Write-Host "Draft aplikasi: docs/APLIKASI_FAHNOVINZ.md"
Write-Host "Apply nanti (Agustus 2027+): https://claude.com/open-source-max"