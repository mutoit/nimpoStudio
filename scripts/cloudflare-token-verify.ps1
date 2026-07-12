$envFile = Join-Path $PSScriptRoot ".." ".env"
$token = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_API_TOKEN=' }) -replace '^CLOUDFLARE_API_TOKEN=','').Trim()
$account = ((Get-Content $envFile | Where-Object { $_ -match '^CLOUDFLARE_ACCOUNT_ID=' }) -replace '^CLOUDFLARE_ACCOUNT_ID=','').Trim()
$h = @{ Authorization = "Bearer $token" }

$urls = @(
  "https://api.cloudflare.com/client/v4/user/tokens/verify",
  "https://api.cloudflare.com/client/v4/accounts/$account/tokens/verify"
)

foreach ($u in $urls) {
  Write-Host "--- $u ---"
  try {
    $r = Invoke-RestMethod -Uri $u -Headers $h -ErrorAction Stop
    $r | ConvertTo-Json -Depth 6
  } catch {
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message } else { Write-Host $_.Exception.Message }
  }
}