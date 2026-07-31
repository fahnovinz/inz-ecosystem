# Local equivalent of .github/workflows/ci.yml (no GitHub Actions runner needed)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== tests + coverage (c8) ==" -ForegroundColor Cyan
if (-not (Test-Path "node_modules\c8")) {
  npm install --no-fund --no-audit
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm run test:coverage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== CLI ==" -ForegroundColor Cyan
node bin/inz.js help | Out-Null
node bin/inz.js version
node bin/inz.js products --json | Out-Null

Write-Host "== syntax ==" -ForegroundColor Cyan
$files = @(
  "bin/inz.js",
  "src/github-stats.js",
  "src/repo-health.js",
  "src/badges.js",
  "src/github-api.js",
  "src/products.js",
  "src/report.js",
  "src/utils.js"
)
foreach ($f in $files) {
  node --check $f
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "OK - all local CI checks passed." -ForegroundColor Green
