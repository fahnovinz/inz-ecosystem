param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Username,

    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://api.github.com"

function Invoke-GitHubApi {
    param([string]$Path)

    $headers = @{
        Accept = "application/vnd.github+json"
        "User-Agent" = "claude-oss-kit"
    }

    if ($Token) {
        $headers.Authorization = "Bearer $Token"
    }

    return Invoke-RestMethod -Uri "$BaseUrl$Path" -Headers $headers -Method Get
}

function Get-DaysSince {
    param([string]$DateString)
    return [int]((Get-Date) - [datetime]$DateString).TotalDays
}

Write-Host ""
Write-Host "=== Claude for OSS Eligibility Check ===" -ForegroundColor Cyan
Write-Host ""

$user = Invoke-GitHubApi -Path "/users/$Username"
$accountAge = Get-DaysSince $user.created_at

Write-Host "GitHub: @$Username"
Write-Host "URL: $($user.html_url)"
Write-Host "Akun dibuat: $($user.created_at) ($accountAge hari)"
Write-Host "Repo publik: $($user.public_repos)"
Write-Host ""

# General requirements
$accountOk = $accountAge -ge 730
Write-Host "[$(if ($accountOk) { 'PASS' } else { 'FAIL' })] Akun GitHub >= 2 tahun" -ForegroundColor $(if ($accountOk) { 'Green' } else { 'Red' })

try {
    $events = Invoke-GitHubApi -Path "/users/$Username/events/public?per_page=30"
    $cutoff = (Get-Date).AddDays(-90)
    $recent = @($events | Where-Object { [datetime]$_.created_at -ge $cutoff })
    $activityOk = $recent.Count -gt 0
    Write-Host "[$(if ($activityOk) { 'PASS' } else { 'FAIL' })] Aktivitas OSS 90 hari terakhir: $($recent.Count) event" -ForegroundColor $(if ($activityOk) { 'Green' } else { 'Red' })
}
catch {
    Write-Host "[FAIL] Tidak bisa cek aktivitas terbaru: $($_.Exception.Message)" -ForegroundColor Red
    $activityOk = $false
}

# Merged PRs to others (12 months)
$since = (Get-Date).AddYears(-1).ToString("yyyy-MM-dd")
try {
    $search = Invoke-GitHubApi -Path "/search/issues?q=is:pr+author:$Username+is:merged+merged:>=$since+-user:$Username&per_page=1"
    $mergedPrs = $search.total_count
    $prsOk = $mergedPrs -ge 100
    Write-Host "[$(if ($prsOk) { 'PASS' } else { 'INFO' })] PR merged ke repo lain (12 bln): $mergedPrs / 100" -ForegroundColor $(if ($prsOk) { 'Green' } else { 'Yellow' })
}
catch {
    Write-Host "[INFO] Tidak bisa cek PR count (rate limit?). Cek manual di GitHub." -ForegroundColor Yellow
    $mergedPrs = 0
    $prsOk = $false
}

# Owned repos
try {
    $repos = Invoke-GitHubApi -Path "/users/$Username/repos?type=owner&sort=updated&per_page=10"
    $ossRepos = @($repos | Where-Object { -not $_.private -and -not $_.fork })
    $licensed = @($ossRepos | Where-Object { $_.license })
    $licenseOk = $licensed.Count -gt 0

    Write-Host "[$(if ($licenseOk) { 'PASS' } else { 'FAIL' })] Repo dengan lisensi OSI: $($licensed.Count)" -ForegroundColor $(if ($licenseOk) { 'Green' } else { 'Red' })

    Write-Host ""
    Write-Host "--- Repo OSS Teratas ---"
    foreach ($repo in $ossRepos | Select-Object -First 5) {
        $license = if ($repo.license) { $repo.license.spdx_id } else { "none" }
        Write-Host "  - $($repo.full_name) | stars: $($repo.stargazers_count) | license: $license"
    }
}
catch {
    Write-Host "[FAIL] Tidak bisa cek repos: $($_.Exception.Message)" -ForegroundColor Red
    $licenseOk = $false
}

Write-Host ""
Write-Host "--- Kesimpulan ---" -ForegroundColor Cyan

if ($accountOk -and $activityOk -and $licenseOk) {
    if ($prsOk) {
        Write-Host "Siap apply via Maintainer Track (Active Contributor)!" -ForegroundColor Green
    }
    else {
        Write-Host "Syarat umum OK. Apply via Ecosystem Impact Track dengan penjelasan 500 kata." -ForegroundColor Yellow
    }
}
else {
    Write-Host "Belum memenuhi syarat umum. Lihat docs/PANDUAN_APLIKASI.md" -ForegroundColor Red
}

Write-Host ""
Write-Host "Apply: https://claude.com/open-source-max"
Write-Host "Draft aplikasi: node bin/claude-oss-kit.js draft $Username"
Write-Host ""