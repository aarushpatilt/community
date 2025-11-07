@echo off
REM Simple batch file to compile and run purchase tests with backend code
REM Run this from the tests directory

echo Finding Visual Studio...
set VSINSTALLDIR=
for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath 2^>nul`) do set VSINSTALLDIR=%%i

if "%VSINSTALLDIR%"=="" (
    REM Try Program Files (not x86)
    for /f "usebackq tokens=*" %%i in (`"%ProgramFiles%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath 2^>nul`) do set VSINSTALLDIR=%%i
)

if "%VSINSTALLDIR%"=="" (
    echo ERROR: Visual Studio not found!
    echo Please make sure Visual Studio 2019 or 2022 is installed.
    pause
    exit /b 1
)

set VCVARS=%VSINSTALLDIR%\VC\Auxiliary\Build\vcvars64.bat

if not exist "%VCVARS%" (
    echo ERROR: vcvars64.bat not found at %VCVARS%
    pause
    exit /b 1
)

echo Initializing Visual Studio environment...
echo Found Visual Studio at: %VSINSTALLDIR%
call "%VCVARS%" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Environment setup had issues, but continuing...
)

echo.
echo ==========================================
echo Compiling Purchase Tests with Backend Code
echo ==========================================
echo.

REM Compile test file
cl /EHsc /std:c++17 /c purchase_tests.cpp /I. /I..\src\Backend
if errorlevel 1 goto :error

REM Compile backend file
cl /EHsc /std:c++17 /c ..\src\Backend\PurchaseService.cpp /I..\src\Backend
if errorlevel 1 goto :error

REM Link object files
link purchase_tests.obj PurchaseService.obj /OUT:purchase_test.exe
if errorlevel 1 goto :error

echo.
echo ==========================================
echo Running Purchase Tests
echo ==========================================
echo.

REM Run the tests
purchase_test.exe

echo.
echo ==========================================
echo Tests completed!
echo ==========================================
echo.

goto :cleanup

:error
echo.
echo ERROR: Compilation or linking failed!
goto :cleanup

:cleanup
REM Clean up object files
del *.obj 2>nul
echo.
pause
exit /b 0

