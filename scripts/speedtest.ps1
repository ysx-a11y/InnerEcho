# InnerEcho 站点测速（本地执行，默认 5 轮）
#
# 测：首页 HTML 的 TTFB/总耗时 + 首屏 JS/CSS/字体的耗时与 CF 缓存命中状态
# 用法：powershell -ExecutionPolicy Bypass -File scripts\speedtest.ps1 [-Rounds 5]

param(
  [int]$Rounds = 5,
  [string]$Base = 'https://secret.neural-node.xyz'
)

$ErrorActionPreference = 'Stop'
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
$tmp = Join-Path $env:TEMP ('ie-speedtest-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function Test-Url([string]$path) {
  $hdrFile = Join-Path $tmp ('hdr-' + [guid]::NewGuid().ToString('N') + '.txt')
  $out = curl.exe -s -o NUL -D $hdrFile -w "`t%{http_code}|%{time_starttransfer}|%{time_total}" `
    --max-time 30 -A $ua -H "Accept: */*" -H "Accept-Language: zh-CN,zh;q=0.9" "$Base$path"
  $parts = $out.Trim().Split('|')
  $cacheLine = Get-Content $hdrFile | Select-String '^cf-cache-status:\s*(\S+)' | Select-Object -First 1
  $cacheVal = if ($cacheLine) { $cacheLine.Matches.Groups[1].Value } else { '-' }
  Remove-Item -LiteralPath $hdrFile -Force -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Path  = $path
    Status = [int]$parts[0]
    Ttfb  = [math]::Round([double]$parts[1] * 1000)
    Total = [math]::Round([double]$parts[2] * 1000)
    Cache = $cacheVal
  }
}

function Show-Stats([object[]]$vals) {
  $v = @($vals | Where-Object { $null -ne $_ })
  if ($v.Count -eq 0) { return '-' }
  $min = [int]($v | Measure-Object -Minimum).Minimum
  $max = [int]($v | Measure-Object -Maximum).Maximum
  $avg = [int](($v | Measure-Object -Average).Average)
  return "min=${min}ms  max=${max}ms  avg=${avg}ms"
}

try {
  # 预检：拉 HTML 提取首屏资源
  Write-Host "→ 预检 $Base ..."
  $html = curl.exe -s --max-time 30 -A $ua -H "Accept: text/html,application/xhtml+xml" `
    -H "Accept-Language: zh-CN,zh;q=0.9" "$Base/"
  $assetUrls = [regex]::Matches($html, '/assets/[A-Za-z0-9._-]+') | ForEach-Object { $_.Value } | Select-Object -Unique
  Write-Host "HTML 引用: $($assetUrls -join ', ')"
  $cssUrl = $assetUrls | Where-Object { $_ -like '*.css' } | Select-Object -First 1
  $fonts = @()
  if ($cssUrl) {
    $css = curl.exe -s --max-time 30 -A $ua "$Base$cssUrl"
    $fonts = [regex]::Matches($css, 'url\(([^)]*\.woff2)\)') | ForEach-Object {
      $u = $_.Groups[1].Value
      if ($u -like '/*') { $u } elseif ($u -like 'http*') { $u } else { '/assets/' + ($u -replace '^\./', '') }
    } | Select-Object -Unique
    Write-Host "字体: $($fonts -join ', ')"
  }
  $resources = @($assetUrls) + @($fonts) | Select-Object -Unique

  $rows = @()
  for ($r = 1; $r -le $Rounds; $r++) {
    Write-Host "`n--- 第 $r 轮 ---"
    $htmlRes = Test-Url '/'
    Write-Host "HTML: HTTP $($htmlRes.Status) cf=$($htmlRes.Cache) TTFB=$($htmlRes.Ttfb)ms total=$($htmlRes.Total)ms"
    $assetRes = @()
    foreach ($p in $resources) {
      $x = Test-Url $p
      $assetRes += $x
      Write-Host "  $($x.Path -replace '^/assets/', '') HTTP $($x.Status) cf=$($x.Cache) total=$($x.Total)ms"
    }
    $worst = ($assetRes | Measure-Object -Property Total -Maximum).Maximum
    $rows += [pscustomobject]@{ Round = $r; Html = $htmlRes; Assets = $assetRes; Est = ($htmlRes.Total + $worst) }
    Write-Host "估算整页(HTML+并发最慢资源)=$($htmlRes.Total + $worst)ms"
    if ($r -lt $Rounds) { Start-Sleep -Seconds 2 }
  }

  Write-Host "`n===== 汇总（$Rounds 轮） ====="
  Write-Host "HTML TTFB    : $(Show-Stats @($rows | ForEach-Object { $_.Html.Ttfb }))"
  Write-Host "HTML 总耗时  : $(Show-Stats @($rows | ForEach-Object { $_.Html.Total }))"
  Write-Host "估算整页    : $(Show-Stats @($rows | ForEach-Object { $_.Est }))"
  Write-Host "HTML 缓存状态: $(($rows | ForEach-Object { $_.Html.Cache }) -join ' / ')"
  $assetCache = @{}
  foreach ($row in $rows) { foreach ($a in $row.Assets) { $assetCache[($a.Path -replace '^/assets/', '')] = $a.Cache } }
  Write-Host "资源缓存状态 : $(($assetCache.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ', ')"
}
finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
