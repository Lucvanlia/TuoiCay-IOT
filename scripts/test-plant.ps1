param([string]$ScopeSdk = 'C:\Program Files\Microsoft Visual Studio\18\Community\SDK\ScopeCppSDK\vc15')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = Join-Path $root '.pio\host-tests'
$evidence = Join-Path $root 'evidence'
New-Item -ItemType Directory -Force -Path $output,$evidence | Out-Null
Push-Location $root
try {
  foreach ($simulation in @(0,1)) {
    $target = Join-Path $output "plant-$simulation"
    $gcc = Get-Command g++ -ErrorAction SilentlyContinue
    if ($gcc) {
      & $gcc.Source '-std=c++11' '-Wall' '-Wextra' '-Werror' "-DIRRIGATION_SIMULATION=$simulation" '-Iinclude' 'test/plant_simulation.cpp' '-o' "$target.exe"
    } elseif (Test-Path "$ScopeSdk\VC\bin\cl.exe") {
      & "$ScopeSdk\VC\bin\cl.exe" /nologo /EHsc /MT /W4 /WX "/DIRRIGATION_SIMULATION=$simulation" /Iinclude "/I$ScopeSdk\VC\include" "/I$ScopeSdk\SDK\include\ucrt" 'test/plant_simulation.cpp' "/Fo$target.obj" "/Fe$target.exe" /link "/LIBPATH:$ScopeSdk\VC\lib" "/LIBPATH:$ScopeSdk\SDK\lib"
    } else { throw 'Need g++ or MSVC ScopeCppSDK.' }
    if ($LASTEXITCODE -ne 0) { throw 'Plant test compilation failed.' }
    $result = & "$target.exe"
    $testExit = $LASTEXITCODE
    $result | Set-Content -Encoding UTF8 (Join-Path $evidence "plant-$simulation.jsonl")
    $result | Select-Object -Last 1
    if ($testExit -ne 0) { throw 'Plant test failed.' }
  }
} finally { Pop-Location }
