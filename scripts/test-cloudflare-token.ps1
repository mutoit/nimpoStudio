# Prueba qué puede hacer tu token actual (sin mostrar el secret).
$envFile = Join-Path $PSScriptRoot ".." ".env"
$token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$account = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=','').Trim()
$zone = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ZONE_ID=' }) -replace '^CLOUDFLARE_ZONE_ID=','').Trim()
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "Token: $($token.Substring(0, 8))... | Account: $account | Zone: $zone"
Write-Host ""

# Verificación (solo válida para Account API Tokens cfat_)
try {
  $verify = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$account/tokens/verify" -Headers $h -ErrorAction Stop
  if ($verify.success) {
    Write-Host "[OK] Token activo (id $($verify.result.id))"
  }
} catch {
  Write-Host "[NO] No se pudo verificar el token"
}

Write-Host ""

$tests = @(
  @{ Name = "Cuenta"; Url = "https://api.cloudflare.com/client/v4/accounts/$account" },
  @{ Name = "Zona"; Url = "https://api.cloudflare.com/client/v4/zones/$zone" },
  @{ Name = "DNS"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/dns_records?per_page=1" },
  @{ Name = "Email rules"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/email/routing/rules" },
  @{ Name = "Web Analytics RUM"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/rum/site_info/list"; Need = "Account > Account Analytics > Read + Edit" },
  @{ Name = "Workers scripts"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/workers/scripts"; Need = "Account > Workers Scripts > Edit" },
  @{ Name = "Workers routes"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/workers/routes"; Need = "Zone > Workers Routes > Edit" },
  @{ Name = "Cache purge"; Url = "POST:https://api.cloudflare.com/client/v4/zones/$zone/purge_cache"; Need = "Zone > Cache Purge > Purge" }
)

$missing = @()

foreach ($t in $tests) {
  if ($t.Url -like "POST:*") {
    $url = $t.Url -replace "^POST:", ""
    try {
      $null = Invoke-RestMethod -Method POST -Uri $url -Headers $h -Body '{"purge_everything":true}' -ErrorAction Stop
      Write-Host "[OK] $($t.Name)"
    } catch {
      Write-Host "[NO] $($t.Name) — falta: $($t.Need)"
      if ($t.Need) { $missing += $t.Need }
    }
  } else {
    try {
      $r = Invoke-RestMethod -Uri $t.Url -Headers $h -ErrorAction Stop
      if ($r.success) { Write-Host "[OK] $($t.Name)" } else { Write-Host "[NO] $($t.Name)" }
    } catch {
      if ($t.Need) {
        Write-Host "[NO] $($t.Name) — falta: $($t.Need)"
        $missing += $t.Need
      } else {
        Write-Host "[NO] $($t.Name)"
      }
    }
  }
}

Write-Host ""
Write-Host "=== Variables PUBLIC en .env ==="
$pub = Get-Content $envFile | Where-Object { $_ -match '^PUBLIC_' }
if (-not $pub) {
  Write-Host "(ninguna) — analíticas desactivadas en build"
} else {
  foreach ($line in $pub) {
    $k, $v = $line -split '=', 2
    $status = if ([string]::IsNullOrWhiteSpace($v)) { "VACÍO" } else { "OK" }
    Write-Host "$k = $status"
  }
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "=== Permisos que aún faltan en el token ==="
  $missing | Select-Object -Unique | ForEach-Object { Write-Host "  - $_" }
  Write-Host ""
  Write-Host "Editar token: https://dash.cloudflare.com/profile/api-tokens/"
  Write-Host "O Ctrl+K en el panel → 'API token'"
}