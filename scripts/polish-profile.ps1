param(
    [switch]$SkipAuth
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

Write-Host ""
Write-Host "=== Polish GitHub Profile ===" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipAuth) {
    Write-Host "Refreshing auth (needs user scope)..." -ForegroundColor Yellow
    gh auth refresh -h github.com -s user,repo,workflow,gist
}

Write-Host "Updating profile..." -ForegroundColor Yellow
gh api user -X PATCH `
    -f name="Fahrezi Nova Inzaghi" `
    -f bio="Building open-source dev tools @ INZ Ecosystem. Indie developer from Indonesia." `
    -f location="Indonesia" `
    -f blog="https://github.com/fahnovinz/inz-ecosystem"

Write-Host "Pinning inz-ecosystem..." -ForegroundColor Yellow
$repoId = gh api repos/fahnovinz/inz-ecosystem --jq .node_id
$query = "mutation { updatePinnedRepositories(input: { repositoryIds: [""$repoId""], pinned: true }) { pinnedRepositories { totalCount } } }"
gh api graphql -f query=$query

Write-Host "Adding repo topics..." -ForegroundColor Yellow
gh repo edit fahnovinz/inz-ecosystem `
    --add-topic javascript `
    --add-topic indie-dev `
    --add-topic nodejs

Write-Host ""
Write-Host "Done! Check https://github.com/fahnovinz" -ForegroundColor Green
Write-Host ""