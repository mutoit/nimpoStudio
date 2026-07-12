# Prueba endpoints adicionales para mapear permisos reales del token.
$envFile = Join-Path $PSScriptRoot ".." ".env"
$token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$account = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=','').Trim()
$zone = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ZONE_ID=' }) -replace '^CLOUDFLARE_ZONE_ID=','').Trim()
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$tests = @(
  @{ Name = "Account Analytics (dashboard)"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/analytics/dashboard" },
  @{ Name = "Workers subdomain"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/workers/subdomain" },
  @{ Name = "Workers services"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/workers/services" },
  @{ Name = "Pages projects"; Url = "https://api.cloudflare.com/client/v4/accounts/$account/pages/projects" },
  @{ Name = "Zone settings (all)"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/settings" },
  @{ Name = "Zone analytics"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/analytics/dashboard" },
  @{ Name = "Email routing enable"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/email/routing/enable" },
  @{ Name = "DNS write test (GET only)"; Url = "https://api.cloudflare.com/client/v4/zones/$zone/dns_records?type=TXT&name=nimpo3dstudio.com" }
)

foreach ($t in $tests) {
  try {
    $r = Invoke-RestMethod -Uri $t.Url -Headers $h -ErrorAction Stop
    Write-Host "[OK] $($t.Name)"
  } catch {
    $msg = $_.ErrorDetails.Message
    if ($msg -match '"code":\s*(\d+)') { $code = $Matches[1] } else { $code = "?" }
    Write-Host "[NO] $($t.Name) (code $code)"
  }
}