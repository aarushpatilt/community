# PowerShell script to compile and run tests using Visual Studio compiler

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setting up Visual Studio Environment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find Visual Studio installation - search more thoroughly
$vcvarsPath = $null
$vsYear = $null

# Search paths
$vsSearchPaths = @(
    "${env:ProgramFiles}\Microsoft Visual Studio",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio"
)

# Also check for Developer Command Prompt shortcut
$devCmdShortcuts = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Visual Studio *",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Visual Studio *"
)

Write-Host "Searching for Visual Studio..." -ForegroundColor Yellow

foreach ($vsBasePath in $vsSearchPaths) {
    if (Test-Path $vsBasePath) {
        Write-Host "  Checking: $vsBasePath" -ForegroundColor Gray
        
        # Check all subdirectories (not just year-named ones)
        $allDirs = Get-ChildItem $vsBasePath -Directory -ErrorAction SilentlyContinue
        
        foreach ($vsDir in $allDirs) {
            $path1 = Join-Path $vsDir.FullName "VC\Auxiliary\Build\vcvars64.bat"
            $path2 = Join-Path $vsDir.FullName "VC\Auxiliary\Build\vcvarsall.bat"
            
            if (Test-Path $path1) {
                $vcvarsPath = $path1
                $vsYear = $vsDir.Name
                Write-Host "  Found: $vsYear" -ForegroundColor Green
                break
            } elseif (Test-Path $path2) {
                $vcvarsPath = $path2
                $vsYear = $vsDir.Name
                Write-Host "  Found: $vsYear" -ForegroundColor Green
                break
            }
        }
        
        if ($vcvarsPath) { break }
    }
}

# If still not found, try using vswhere
if (-not $vcvarsPath) {
    Write-Host "  Trying vswhere.exe..." -ForegroundColor Gray
    $vswherePaths = @(
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe",
        "${env:ProgramFiles}\Microsoft Visual Studio\Installer\vswhere.exe"
    )
    
    foreach ($vswherePath in $vswherePaths) {
        if (Test-Path $vswherePath) {
            try {
                $vsInstallPath = & $vswherePath -latest -property installationPath 2>$null
                if ($vsInstallPath) {
                    $potentialPath = Join-Path $vsInstallPath "VC\Auxiliary\Build\vcvars64.bat"
                    if (Test-Path $potentialPath) {
                        $vcvarsPath = $potentialPath
                        $vsYear = "Latest"
                        Write-Host "  Found via vswhere: Latest" -ForegroundColor Green
                        break
                    }
                }
            } catch {
                continue
            }
        }
    }
}

if (-not $vcvarsPath) {
    Write-Host ""
    Write-Host "ERROR: Could not find Visual Studio vcvars64.bat" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Open 'Developer Command Prompt for VS' from Start Menu, then run:" -ForegroundColor Cyan
    Write-Host "   cd $PSScriptRoot" -ForegroundColor White
    Write-Host "   .\run_tests_manual.bat" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Or install Visual Studio with C++ development tools" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if Developer Command Prompt exists
    $foundDevCmd = $false
    foreach ($shortcutPath in $devCmdShortcuts) {
        $shortcuts = Get-ChildItem $shortcutPath -ErrorAction SilentlyContinue
        if ($shortcuts) {
            Write-Host "Found Developer Command Prompt shortcuts!" -ForegroundColor Green
            Write-Host "Please use one of these from Start Menu." -ForegroundColor Yellow
            $foundDevCmd = $true
            break
        }
    }
    
    if (-not $foundDevCmd) {
        Write-Host "Could not find Developer Command Prompt. Please install VS with C++ tools." -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host "Found Visual Studio $vsYear" -ForegroundColor Green
Write-Host "Using: $vcvarsPath" -ForegroundColor Gray
Write-Host ""

# Check if catch.hpp exists
$catch2File = Join-Path $PSScriptRoot "catch.hpp"
if (-not (Test-Path $catch2File)) {
    Write-Host "ERROR: catch.hpp not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: .\setup_catch2.ps1" -ForegroundColor Yellow
    Write-Host "Or manually download catch.hpp from:" -ForegroundColor Yellow
    Write-Host "https://raw.githubusercontent.com/catchorg/Catch2/devel/single_include/catch2/catch.hpp" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "Found catch.hpp" -ForegroundColor Green
Write-Host ""

# Create a temporary batch file to set up environment and compile
$tempBatch = Join-Path $PSScriptRoot "temp_vs_setup.bat"
$tempScript = Join-Path $PSScriptRoot "temp_run_tests.bat"

# Create batch file that sets up VS environment and compiles
@"
@echo off
call "$vcvarsPath"
if errorlevel 1 (
    echo ERROR: Failed to initialize Visual Studio environment
    exit /b 1
)

echo Compiling tests...
cl /EHsc /std:c++17 login_tests.cpp /Fe:login_test.exe /Fo:login_test.obj /I.
if errorlevel 1 goto :error

cl /EHsc /std:c++17 logout_tests.cpp /Fe:logout_test.exe /Fo:logout_test.obj /I.
if errorlevel 1 goto :error

cl /EHsc /std:c++17 search_tests.cpp /Fe:search_test.exe /Fo:search_test.obj /I.
if errorlevel 1 goto :error

cl /EHsc /std:c++17 purchase_tests.cpp /Fe:purchase_test.exe /Fo:purchase_test.obj /I.
if errorlevel 1 goto :error

echo.
echo ==========================================
echo Running All Test Suites
echo ==========================================
echo.

echo Running Login Tests
login_test.exe
echo.

echo Running Logout Tests
logout_test.exe
echo.

echo Running Search Tests
search_test.exe
echo.

echo Running Purchase Tests
purchase_test.exe
echo.

echo ==========================================
echo All tests completed!
echo ==========================================

:cleanup
del *.obj 2>nul
REM Optional: uncomment the next line to delete .exe files after running
REM del *.exe 2>nul
exit /b 0

:error
echo Compilation failed!
del *.obj 2>nul
exit /b 1
"@ | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "Running compilation and tests..." -ForegroundColor Yellow
Write-Host ""

# Run the batch file through cmd.exe
& cmd /c $tempScript

$exitCode = $LASTEXITCODE

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Tests failed or compilation error" -ForegroundColor Red
    exit $exitCode
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

