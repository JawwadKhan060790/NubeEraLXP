$pattern = 'dark:[a-zA-Z0-9/\[\].:_%-]+'
Get-ChildItem 'e:\veriton\LMS\Frontend\src' -Include '*.tsx','*.jsx','*.css' -Recurse | ForEach-Object {
  try {
    $c = Get-Content $_.FullName -Raw -ErrorAction Stop
    $n = $c -replace $pattern, ''
    if ($n -ne $c) {
      Set-Content $_.FullName $n -NoNewline
      Write-Host "Cleaned: $($_.Name)"
    }
  } catch {
    Write-Warning "Could not process $($_.FullName): $_"
  }
}
Write-Host "Done!"
