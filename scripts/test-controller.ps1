param([string]$ScopeSdk = 'C:\Program Files\Microsoft Visual Studio\18\Community\SDK\ScopeCppSDK\vc15')
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = Join-Path $root '.pio\host-tests'
New-Item -ItemType Directory -Force -Path $output | Out-Null
Push-Location $root
try {
$gcc = Get-Command g++ -ErrorAction SilentlyContinue
if ($gcc) {
  & $gcc.Source '-std=c++11' '-Wall' '-Wextra' '-Werror' '-Iinclude' 'test/controller_test.cpp' '-o' "$output\controller_test.exe"
} elseif (Test-Path "$ScopeSdk\VC\bin\cl.exe") {
  & "$ScopeSdk\VC\bin\cl.exe" /nologo /EHsc /MT /W4 /WX /wd4710 /Iinclude "/I$ScopeSdk\VC\include" "/I$ScopeSdk\SDK\include\ucrt" 'test/controller_test.cpp' "/Fo$output\controller_test.obj" "/Fe$output\controller_test.exe" /link "/LIBPATH:$ScopeSdk\VC\lib" "/LIBPATH:$ScopeSdk\SDK\lib"
} else {
  throw 'Need g++ in PATH or MSVC ScopeCppSDK (pass -ScopeSdk). Tests compile the actual Controller.h.'
}
if ($LASTEXITCODE -ne 0) { throw 'Host test compilation failed.' }
& "$output\controller_test.exe"
if ($LASTEXITCODE -ne 0) { throw 'Controller test failed.' }
} finally { Pop-Location }
