param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Repo,

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

function Test-FileExists {
    param([string]$Owner, [string]$Name, [string]$FilePath)

    try {
        $null = Invoke-GitHubApi -Path "/repos/$Owner/$Name/contents/$FilePath"
        return $true
    } catch {
        return $false
    }
}

if ($Repo -notmatch "^([^/]+)/([^/]+)$") {
    throw "Invalid repo format. Use owner/repo"
}

$owner, $name = $Repo -split "/"

Write-Host ""
Write-Host "  INZ Repo Health — $Repo" -ForegroundColor Cyan
Write-Host ""

$data = Invoke-GitHubApi -Path "/repos/$owner/$name"
$hasReadme = Test-FileExists -Owner $owner -Name $name -FilePath "README.md"
$hasContributing = Test-FileExists -Owner $owner -Name $name -FilePath "CONTRIBUTING.md"

$hasCi = $false
try {
    $workflows = Invoke-GitHubApi -Path "/repos/$owner/$name/actions/workflows"
    $hasCi = $workflows.total_count -gt 0
} catch {}

$daysSincePush = [int]((Get-Date) - [datetime]$data.pushed_at).TotalDays

$checks = @(
    @{ Label = "Repository description"; Pass = [bool]$data.description },
    @{ Label = "README present"; Pass = $hasReadme },
    @{ Label = "License declared"; Pass = [bool]$data.license },
    @{ Label = "CI workflow detected"; Pass = $hasCi },
    @{ Label = "CONTRIBUTING guide"; Pass = $hasContributing },
    @{ Label = "Issue tracking enabled"; Pass = $data.has_issues },
    @{ Label = "Updated within 90 days"; Pass = ($daysSincePush -le 90) }
)

$score = 0
$weights = @(10, 15, 15, 15, 10, 10, 15)

Write-Host "  Checks"
for ($i = 0; $i -lt $checks.Count; $i++) {
    if ($checks[$i].Pass) {
        $mark = "[ok]"
        $score += $weights[$i]
    } else {
        $mark = "[--]"
    }
    Write-Host "  $mark $($checks[$i].Label)"
}

$grade = if ($score -ge 90) { "Excellent" } elseif ($score -ge 70) { "Good" } elseif ($score -ge 50) { "Fair" } else { "Needs work" }

Write-Host ""
Write-Host "  Score: $score/100 ($grade)"
Write-Host "  Stars: $($data.stargazers_count)  |  Issues: $($data.open_issues_count)  |  Last push: $($data.pushed_at)"
Write-Host ""