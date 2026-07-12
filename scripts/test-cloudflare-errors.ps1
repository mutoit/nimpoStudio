# Muestra errores detallados de endpoints que fallan (sin mostrar el token).
$envFile = Join-Path $PSScriptRoot ".." ".env"
$token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$account = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=','').Trim()
$zone = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ZONE_ID=' }) -replace '^CLOUDFLARE_ZONE_ID=','').Trim()

Write-Host "Token prefix: $($token.Substring(0, [Math]::Min(8, $token.Length)))... (len $($token.Length))"
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$tests = @(
  @{ Name = "Web Analytics RUM list"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/rum/site_info/list" },
  @{ Name = "Workers scripts"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/workers/scripts" },
  @{ Name = "Cache purge"; Method = "POST"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/purge_cache"; Body = '{"purge_everything":true}' },
  @{ Name = "Workers routes"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/workers/routes" },
  @{ Name = "Page rules"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/pagerules" }
)

foreach ($t in $tests) {
  Write-Host "`n--- $($t.Name) ---"
  try {
    if ($t.Method -eq "POST") {
      $r = Invoke-RestMethod -Method POST -Uri $t.Url -Headers $h -Body $t.Body -ErrorAction Stop
    } else {
      $r = Invoke-RestMethod -Uri $t.Url -Headers $h -ErrorAction Stop
    }
    Write-Host "[OK] success=$($r.success)"
  } catch {
    $detail = $_.ErrorDetails.Message
    if ($detail) { Write-Host $detail } else { Write-Host $_.Exception.Message }
  }
}