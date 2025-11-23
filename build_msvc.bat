@echo off
REM Build script for C++ backend using MSVC (Visual Studio)
REM This should be run from "Developer Command Prompt for VS" or "x64 Native Tools Command Prompt"

echo Building C++ backend with MSVC and MongoDB support...
echo.

REM Force x64 architecture - call vcvars64.bat explicitly
echo Setting up x64 build environment...
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" 2>nul
if errorlevel 1 (
    call "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" 2>nul
)
if errorlevel 1 (
    call "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" 2>nul
)
if errorlevel 1 (
    call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" 2>nul
)
if errorlevel 1 (
    echo WARNING: Could not find vcvars64.bat. Make sure you're running from x64 Native Tools Command Prompt!
)

REM Verify we're using x64 compiler
cl 2>&1 | findstr /C:"for x64" >nul
if errorlevel 1 (
    echo ERROR: Not using x64 compiler! Please use "x64 Native Tools Command Prompt for VS"
    pause
    exit /b 1
)
echo [OK] Using x64 compiler
echo.

REM Check if httplib.h exists
if not exist "src\Backend\httplib.h" (
    echo ERROR: httplib.h not found!
    echo Please download it first.
    pause
    exit /b 1
)

REM Check MongoDB headers
if exist "C:\vcpkg\installed\x64-windows\include\mongocxx\v_noabi\mongocxx\client.hpp" (
    echo [OK] MongoDB headers found
) else (
    echo [ERROR] MongoDB headers not found!
    echo Install MongoDB driver: C:\vcpkg\vcpkg.exe install mongo-cxx-driver:x64-windows
    pause
    exit /b 1
)

echo.
echo Compiling with MongoDB support using MSVC...
echo.

REM Build with MSVC and MongoDB (64-bit)
cl /EHsc /std:c++17 /I src\Backend /I "C:\vcpkg\installed\x64-windows\include" /I "C:\vcpkg\installed\x64-windows\include\mongocxx\v_noabi" /I "C:\vcpkg\installed\x64-windows\include\bsoncxx\v_noabi" /D HAS_MONGODB /D _WIN32_WINNT=0x0A00 /D _WIN64 src\Backend\main.cpp src\Backend\Server.cpp src\Backend\Cart.cpp src\Backend\LoginService.cpp src\Backend\PurchaseService.cpp src\Backend\PurchaseHistory.cpp src\Backend\SearchService.cpp src\Backend\SettingsService.cpp src\Backend\MongoDBService.cpp /link /LIBPATH:"C:\vcpkg\installed\x64-windows\lib" mongocxx-v_noabi-rhi-md.lib bsoncxx-v_noabi-rhi-md.lib mongoc-1.0.lib bson-1.0.lib ws2_32.lib wsock32.lib /OUT:backend.exe /MACHINE:X64

if exist backend.exe (
    echo.
    echo [SUCCESS] Build completed with MongoDB support!
    echo.
    echo Copying MongoDB DLLs...
    copy "C:\vcpkg\installed\x64-windows\bin\mongocxx-v_noabi-rhi-md.dll" . >nul 2>&1
    copy "C:\vcpkg\installed\x64-windows\bin\bsoncxx-v_noabi-rhi-md.dll" . >nul 2>&1
    copy "C:\vcpkg\installed\x64-windows\bin\mongoc-1.0.dll" . >nul 2>&1
    copy "C:\vcpkg\installed\x64-windows\bin\bson-1.0.dll" . >nul 2>&1
    if exist "C:\vcpkg\installed\x64-windows\bin\utf8proc.dll" (
        copy "C:\vcpkg\installed\x64-windows\bin\utf8proc.dll" . >nul 2>&1
    )
    if exist "C:\vcpkg\installed\x64-windows\bin\zlib1.dll" (
        copy "C:\vcpkg\installed\x64-windows\bin\zlib1.dll" . >nul 2>&1
    )
    echo [OK] DLLs copied
    echo.
    echo Build successful! Run with: .\backend.exe 3000
) else (
    echo.
    echo [ERROR] Build failed!
    echo Check the error messages above.
)

pause

