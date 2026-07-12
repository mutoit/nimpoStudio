# Crea o lista sitios Cloudflare Web Analytics (RUM) vía API.
# Requiere token con Account Analytics Read + Edit.

param(
  [string]$Hostname = "www.nimpo3dstudio.com"
)

$envFile = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envFile)) {
  Write-Error "No existe .env. Copia .env.example y rellena CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID."
  exit 1
}

$lines = Get-Content $envFile
$token = (($lines | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=', '').Trim()
$account = (($lines | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=', '').Trim()

if (-not $token -or -not $account) {
  Write-Error "Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID en .env"
  exit 1
}

$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "=== Sitios RUM existentes ==="
$list = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$account/rum/site_info/list" -Headers $h -Method GET
$list.result | ForEach-Object { Write-Host "- $($_.host) token=$($_.site_token)" }

Write-Host "`n=== Crear sitio $Hostname (si no existe) ==="
$body = @{ host = $Hostname; automatic_setup = $true } | ConvertTo-Json
try {
  $created = Invoke-RestMethod -Method POST -Uri "https://api.cloudflare.com/client/v4/accounts/$account/rum/site_info" -Headers $h -Body $body
  if ($created.success) {
    Write-Host "OK. Token beacon:"
    Write-Host $created.result.site_token
    Write-Host "`nPonlo en .env y Cloudflare Build vars como:"
    Write-Host "PUBLIC_CF_WEB_ANALYTICS_TOKEN=$($created.result.site_token)"
  }
} catch {
  Write-Host $_.ErrorDetails.Message
  Write-Host "Si falla por permisos, añade Account Analytics Edit al token o crea el sitio en el panel Web Analytics."
}