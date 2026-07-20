# Crea app Cloudflare Access self-hosted para /admin* (email allowlist).
# Requiere: CLOUDFLARE_API_TOKEN con Access:Edit + Account:Read
# Uso: pwsh scripts/setup-access-admin.ps1 -Email "tu@email.com"

param(
  [Parameter(Mandatory = $true)][string]$Email,
  [string]$AccountId = "9465ef52d5149092dd29a0382f746954",
  [string[]]$Hosts = @("www.nimpo3dstudio.com", "nimpo3dstudio.com")
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*CLOUDFLARE_API_TOKEN=(.+)$') {
      $env:CLOUDFLARE_API_TOKEN = $Matches[1].Trim()
    }
  }
}
if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Error "Falta CLOUDFLARE_API_TOKEN en .env"
}

$headers = @{
  Authorization  = "Bearer $env:CLOUDFLARE_API_TOKEN"
  "Content-Type" = "application/json"
}

$destinations = @()
foreach ($h in $Hosts) {
  $destinations += @{
    type = "public"
    uri  = "${h}/admin*"
  }
}

$body = @{
  name                       = "Nimpo Admin Biblioteca"
  type                       = "self_hosted"
  destinations               = $destinations
  session_duration           = "168h"
  auto_redirect_to_identity  = $false
  policies                   = @(
    @{
      name     = "Allow studio email"
      decision = "allow"
      include  = @(
        @{ email = @{ email = $Email } }
      )
    }
  )
} | ConvertTo-Json -Depth 8

$uri = "https://api.cloudflare.com/client/v4/accounts/$AccountId/access/apps"
try {
  $res = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
  if ($res.success) {
    Write-Host "OK Access app creada: $($res.result.id) — $($res.result.name)"
    Write-Host "Abre https://$($Hosts[0])/admin/biblioteca/ y autentica con $Email"
  } else {
    $res | ConvertTo-Json -Depth 6
    exit 1
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  Write-Host "Crea un API Token con permiso Account → Access: Edit y vuelve a intentar."
  Write-Host "O configura la app a mano: docs/admin-acceso.md"
  exit 1
}
