$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$fontDirectory = Join-Path $projectRoot 'public\fonts'
$cssFile = Join-Path $fontDirectory 'original-google-fonts.css'
$css = [IO.File]::ReadAllText($cssFile, [Text.Encoding]::UTF8)
$fontUrls = @([regex]::Matches($css, 'https://fonts\.gstatic\.com/[^)\s]+') | ForEach-Object { $_.Value } | Select-Object -Unique)
foreach ($fontUrl in $fontUrls) {
  $parsedUrl = [Uri]$fontUrl
  if ($parsedUrl.Scheme -ne 'https' -or $parsedUrl.Host -ne 'fonts.gstatic.com' -or $parsedUrl.AbsolutePath -notmatch '\.(woff2|ttf)$') { throw 'Unexpected font URL.' }
  $digest = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($fontUrl))
  $hashName = ([BitConverter]::ToString($digest)).Replace('-', '').Substring(0, 16).ToLowerInvariant()
  $name = $hashName + [IO.Path]::GetExtension($parsedUrl.AbsolutePath)
  $target = Join-Path $fontDirectory $name
  if (-not (Test-Path -LiteralPath $target)) { Invoke-WebRequest -Uri $fontUrl -OutFile $target -TimeoutSec 30 }
  $css = $css.Replace($fontUrl, '/fonts/' + $name)
}
[IO.File]::WriteAllText((Join-Path $fontDirectory 'fonts.css'), $css, (New-Object Text.UTF8Encoding($false)))
foreach ($family in @('chakrapetch', 'jetbrainsmono', 'plusjakartasans')) {
  Invoke-WebRequest -Uri ('https://raw.githubusercontent.com/google/fonts/main/ofl/' + $family + '/OFL.txt') -OutFile (Join-Path $fontDirectory ($family + '-OFL.txt')) -TimeoutSec 30
}
Write-Output ('Original fonts stored locally: ' + $fontUrls.Count)
