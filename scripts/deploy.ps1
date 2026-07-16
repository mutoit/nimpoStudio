# Deploy manual a Cloudflare Pages (respaldo si Git del panel no está activo).
$root = Join-Path $PSScriptRoot ".."
Set-Location $root

Write-Host "Building..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  $token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
  if ($token) { $env:CLOUDFLARE_API_TOKEN = $token }
}

Write-Host "Deploying to Cloudflare Pages (nimpo-studio)..."
npx wrangler pages deploy dist --project-name=nimpo-studio --commit-dirty=true
exit $LASTEXITCODE