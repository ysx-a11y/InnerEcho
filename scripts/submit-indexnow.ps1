# InnerEcho IndexNow submission (run locally; requires the key file to be live)
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\submit-indexnow.ps1
# Depends on: public/<key>.txt deployed (vite copies public/ into dist-user/)

$ErrorActionPreference = 'Stop'

$HostName = 'secret.neural-node.xyz'
$Key      = 'b8c027571ca99108795911fa71f2779b'
$KeyUrl   = "https://$HostName/$Key.txt"

$Urls = @(
  "https://$HostName/",
  "https://$HostName/articles/",
  "https://$HostName/articles/contrast-personality-test.html",
  "https://$HostName/articles/contrast-confession.html",
  "https://$HostName/articles/contrast-questionnaire.html",
  "https://$HostName/articles/bdsm-tendency-test.html",
  "https://$HostName/articles/why-do-good-girls-want-to-lose-control.html",
  "https://$HostName/articles/shadow-self-psychology.html",
  "https://$HostName/articles/anonymous-psychology-questionnaire.html"
)

# 0. Verify the key file is live, otherwise engines reject the submission
$keyCheck = Invoke-WebRequest -Uri $KeyUrl -UseBasicParsing -TimeoutSec 20
if ($keyCheck.StatusCode -ne 200 -or $keyCheck.Content.Trim() -ne $Key) {
  throw "IndexNow key file missing or mismatched: $KeyUrl"
}
Write-Host "-> key file verified"

# 1. api.indexnow.org (reaches Bing / Yandex / Seznam / Naver)
$body = @{
  host        = $HostName
  key         = $Key
  keyLocation = $KeyUrl
  urlList     = $Urls
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri 'https://api.indexnow.org/indexnow' `
  -Method Post -ContentType 'application/json; charset=utf-8' -Body $body -TimeoutSec 30
Write-Host "-> IndexNow submitted $($Urls.Count) URLs, response: $($resp | ConvertTo-Json -Compress)"

# 2. Bing direct endpoint (belt and braces)
$ok = 0
foreach ($u in $Urls) {
  $uenc = [System.Uri]::EscapeDataString($u)
  try {
    $b = Invoke-WebRequest -Uri "https://www.bing.com/indexnow?url=$uenc&key=$Key" `
      -UseBasicParsing -TimeoutSec 20
    if ($b.StatusCode -eq 200 -or $b.StatusCode -eq 202) { $ok++ }
  } catch { }
}
Write-Host "-> Bing direct: $ok/$($Urls.Count) URLs accepted"
