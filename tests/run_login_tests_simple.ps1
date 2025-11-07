# Simple PowerShell script to compile and run login tests
# Run this from the tests directory: .\run_login_tests_simple.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Compiling and Running Login Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find Visual Studio
$vsPath = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath 2>$null
if (-not $vsPath) {
    $vsPath = & "${env:ProgramFiles}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath 2>$null
}

if (-not $vsPath) {
    Write-Host "ERROR: Visual Studio not found!" -ForegroundColor Red
    Write-Host "Please install Visual Studio 2019 or 2022" -ForegroundColor Red
    pause
    exit 1
}

$vcvarsPath = Join-Path $vsPath "VC\Auxiliary\Build\vcvars64.bat"

if (-not (Test-Path $vcvarsPath)) {
    Write-Host "ERROR: vcvars64.bat not found!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Found Visual Studio at: $vsPath" -ForegroundColor Green
Write-Host ""

# Create temporary batch file for compilation
$batchContent = @"
@echo off
call "$vcvarsPath" >nul 2>&1
echo Compiling login tests with backend code...
cl /EHsc /std:c++17 /c login_tests.cpp /I. /I..\src\Backend
if errorlevel 1 goto :error
cl /EHsc /std:c++17 /c ..\src\Backend\LoginService.cpp /I..\src\Backend
if errorlevel 1 goto :error
link login_tests.obj LoginService.obj /OUT:login_test.exe
if errorlevel 1 goto :error
echo.
echo ==========================================
echo Running Login Tests
echo ==========================================
echo.
login_test.exe
echo.
echo ==========================================
echo Tests completed!
echo ==========================================
goto :cleanup
:error
echo ERROR: Compilation failed!
:cleanup
del *.obj 2>nul
"@

$tempScript = Join-Path $PSScriptRoot "temp_run_login.bat"
$batchContent | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "Running compilation and tests..." -ForegroundColor Yellow
Write-Host ""

# Run the batch file
& cmd /c $tempScript

$exitCode = $LASTEXITCODE

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Tests failed or compilation error" -ForegroundColor Red
    pause
    exit $exitCode
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

