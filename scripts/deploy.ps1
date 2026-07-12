$envFile = Join-Path $PSScriptRoot ".." ".env"
$env:CLOUDFLARE_API_TOKEN = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$root = Join-Path $PSScriptRoot ".."
Set-Location $root
npx wrangler deploy