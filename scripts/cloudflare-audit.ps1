# Auditoría con permisos actuales del token (sin mostrar secretos).
$envFile = Join-Path $PSScriptRoot ".." ".env"
$token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$account = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=','').Trim()
$zone = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ZONE_ID=' }) -replace '^CLOUDFLARE_ZONE_ID=','').Trim()
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

function Get-Cf($url) {
  return Invoke-RestMethod -Uri $url -Headers $h -ErrorAction Stop
}

Write-Host "=== Cuenta ==="
$acc = Get-Cf "https://api.cloudflare.com/client/v4/accounts/$account"
Write-Host "Nombre: $($acc.result.name)"

Write-Host "`n=== Zona ==="
$z = Get-Cf "https://api.cloudflare.com/client/v4/zones/$zone"
Write-Host "Dominio: $($z.result.name) | Status: $($z.result.status) | Plan: $($z.result.plan.name)"

Write-Host "`n=== DNS (registros clave) ==="
$dns = Get-Cf "https://api.cloudflare.com/client/v4/zones/$zone/dns_records?per_page=100"
$dns.result | Sort-Object type, name | ForEach-Object {
  $val = if ($_.content.Length -gt 60) { $_.content.Substring(0, 57) + "..." } else { $_.content }
  Write-Host "$($_.type) $($_.name) -> $val (proxied=$($_.proxied))"
}

Write-Host "`n=== Email routing ==="
try {
  $rules = Get-Cf "https://api.cloudflare.com/client/v4/zones/$zone/email/routing/rules"
  foreach ($r in $rules.result) {
    Write-Host "Rule: $($r.name) | enabled=$($r.enabled) | matchers=$($r.matchers.Count) | actions=$($r.actions.Count)"
  }
} catch { Write-Host "Rules: error" }

try {
  $dest = Get-Cf "https://api.cloudflare.com/client/v4/zones/$zone/email/routing/destination"
  foreach ($d in $dest.result) {
    Write-Host "Dest: $($d.email) verified=$($d.verified)"
  }
} catch { Write-Host "Destinations: error" }

Write-Host "`n=== SSL/TLS ==="
try {
  $ssl = Get-Cf "https://api.cloudflare.com/client/v4/zones/$zone/settings/ssl"
  Write-Host "SSL mode: $($ssl.result.value)"
} catch { Write-Host "SSL: sin permiso" }

Write-Host "`n=== Variables PUBLIC en .env ==="
$pub = Get-Content $envFile | Where-Object { $_ -match '^PUBLIC_' }
foreach ($line in $pub) {
  $k, $v = $line -split '=', 2
  $status = if ([string]::IsNullOrWhiteSpace($v)) { "VACÍO" } else { "OK ($($v.Length) chars)" }
  Write-Host "$k = $status"
}
if (-not $pub) { Write-Host "(ninguna PUBLIC_* definida)" }