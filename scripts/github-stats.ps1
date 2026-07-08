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
        "User-Agent" = "inz-ecosystem"
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
Write-Host "=== INZ GitHub Stats ===" -ForegroundColor Cyan
Write-Host ""

$user = Invoke-GitHubApi -Path "/users/$Username"
$accountAge = Get-DaysSince $user.created_at

Write-Host "User:      @$Username"
Write-Host "URL:       $($user.html_url)"
Write-Host "Joined:    $($user.created_at) ($accountAge days ago)"
Write-Host "Repos:     $($user.public_repos)"
Write-Host "Followers: $($user.followers)"
Write-Host ""

try {
    $events = Invoke-GitHubApi -Path "/users/$Username/events/public?per_page=30"
    $cutoff = (Get-Date).AddDays(-90)
    $recent = @($events | Where-Object { [datetime]$_.created_at -ge $cutoff })
    Write-Host "--- Activity (last 90 days) ---"
    Write-Host "Events: $($recent.Count)"
}
catch {
    Write-Host "--- Activity (last 90 days) ---"
    Write-Host "Events: unavailable (rate limit?)"
}

$since = (Get-Date).AddYears(-1).ToString("yyyy-MM-dd")
try {
    $search = Invoke-GitHubApi -Path "/search/issues?q=is:pr+author:$Username+is:merged+merged:>=$since+-user:$Username&per_page=1"
    Write-Host "Merged PRs (12 months, third-party): $($search.total_count)"
}
catch {
    Write-Host "Merged PRs: unavailable"
}

Write-Host ""
Write-Host "--- Repository Portfolio ---"

try {
    $repos = Invoke-GitHubApi -Path "/users/$Username/repos?type=owner&sort=updated&per_page=10"
    $public = @($repos | Where-Object { -not $_.private -and -not $_.fork })
    $stars = ($public | Measure-Object -Property stargazers_count -Sum).Sum
    $licensed = @($public | Where-Object { $_.license }).Count

    Write-Host "Public repos: $($public.Count)"
    Write-Host "Total stars:  $stars"
    Write-Host "Licensed:     $licensed"
    Write-Host ""
    Write-Host "--- Top Repositories ---"

    foreach ($repo in $public | Select-Object -First 5) {
        $license = if ($repo.license) { $repo.license.spdx_id } else { "none" }
        $lang = if ($repo.language) { $repo.language } else { "—" }
        Write-Host "  $($repo.full_name) | stars: $($repo.stargazers_count) | $lang | $license"
    }
}
catch {
    Write-Host "Repository data unavailable"
}

Write-Host ""
Write-Host "INZ Ecosystem — https://github.com/fahnovinz/inz-ecosystem" -ForegroundColor DarkGray
Write-Host ""