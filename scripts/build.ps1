param(
  [ValidateSet('esp32doit-devkit-v1', 'hardware', 'hardware-nodemcu32s', 'all')]
  [string]$Environment = 'esp32doit-devkit-v1',
  [switch]$Upload,
  [string]$Port
)
$ErrorActionPreference = 'Stop'
if ($Upload -and ($Environment -eq 'esp32doit-devkit-v1' -or $Environment -eq 'all')) {
  throw 'Upload is allowed only for an explicitly selected hardware environment.'
}
if ($Upload -and $Port -notmatch '^COM[0-9]+$') { throw 'For upload, specify the actual -Port COMn.' }
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pioCommand = Get-Command pio -ErrorAction SilentlyContinue
$pioPath = if ($pioCommand) { $pioCommand.Source } else { Join-Path $env:USERPROFILE '.platformio\penv\Scripts\pio.exe' }
if (-not (Test-Path -LiteralPath $pioPath)) { throw 'Install PlatformIO IDE first.' }
$mappedDrive = $null
$previousBuildDir = $env:PLATFORMIO_BUILD_DIR
try {
  $buildRoot = $projectRoot
  if ($projectRoot -match '[^\x00-\x7F]') {
    # Reversible DOS drive alias, no copy/move/delete of project files.
    foreach ($letter in @('W','V','U','T','S','R')) {
      if (-not (Test-Path ($letter + ':\'))) { $mappedDrive = $letter + ':'; break }
    }
    if (-not $mappedDrive) { throw 'No free temporary drive letter W..R.' }
    & subst.exe $mappedDrive $projectRoot
    if ($LASTEXITCODE -ne 0) { $mappedDrive = $null; throw 'Cannot map temporary build drive.' }
    $buildRoot = $mappedDrive + '\'
  }
  # Keep outputs separate from the IDE's background .pio/build metadata refresh.
  $env:PLATFORMIO_BUILD_DIR = Join-Path $buildRoot '.firmware/build'
  $pioArgs = @('run', '--project-dir', $buildRoot)
  $environments = if ($Environment -eq 'all') { @('esp32doit-devkit-v1','hardware','hardware-nodemcu32s') } else { @($Environment) }
  foreach ($item in $environments) { $pioArgs += @('-e', $item) }
  if ($Upload) { $pioArgs += @('--target', 'upload', '--upload-port', $Port) }
  & $pioPath @pioArgs
  if ($LASTEXITCODE -ne 0) { throw "PlatformIO build failed ($LASTEXITCODE)." }
} finally {
  $env:PLATFORMIO_BUILD_DIR = $previousBuildDir
  if ($mappedDrive) { & subst.exe $mappedDrive /D }
}
