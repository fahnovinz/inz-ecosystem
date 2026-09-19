# Local equivalent of .github/workflows/ci.yml (no GitHub Actions runner needed)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== lint (syntax) ==" -ForegroundColor Cyan
node scripts/lint.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== tests + coverage (c8) ==" -ForegroundColor Cyan
if (-not (Test-Path "node_modules\c8")) {
  npm install --no-fund --no-audit
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm run test:coverage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== CLI smoke ==" -ForegroundColor Cyan
node bin/inz.js help | Out-Null
node bin/inz.js version
node bin/inz.js products --json | Out-Null
node bin/inz.js products --kind tool | Out-Null

Write-Host "== CLI exit codes ==" -ForegroundColor Cyan
node bin/inz.js definitely-not-a-command 2>&1 | Out-Null
if ($LASTEXITCODE -ne 2) {
  Write-Host "Expected exit code 2 for an unknown command, got $LASTEXITCODE" -ForegroundColor Red
  exit 1
}

Write-Host "OK - all local CI checks passed." -ForegroundColor Green
