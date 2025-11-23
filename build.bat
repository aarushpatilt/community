@echo off
REM Build script for C++ backend (Windows)
REM Tries g++ (MinGW) first, then cl (MSVC)

echo Building C++ backend...

REM Add MinGW to PATH if it exists
if exist "C:\msys64\mingw64\bin\g++.exe" (
    set "PATH=%PATH%;C:\msys64\mingw64\bin"
)

REM Check if httplib.h exists
if not exist "src\Backend\httplib.h" (
    echo ERROR: httplib.h not found!
    echo Please download it first.
    echo See QUICK_START.md for instructions.
    pause
    exit /b 1
)

REM Try building with MongoDB support if available
REM Check for mongo-cxx-driver (package name) which provides mongocxx headers
REM Headers may be in mongocxx\client.hpp or mongocxx\v_noabi\mongocxx\client.hpp
if exist "C:\vcpkg\installed\x64-windows\include\mongocxx\client.hpp" (
    set MONGODB_AVAILABLE=1
) else if exist "C:\vcpkg\installed\x64-windows\include\mongocxx\v_noabi\mongocxx\client.hpp" (
    set MONGODB_AVAILABLE=1
)

if defined MONGODB_AVAILABLE (
    echo Building with MongoDB support...
    REM MongoDB 4.0 uses versioned library names
    REM MongoDB 4.0 uses v_noabi namespace - add both include paths
    g++ -std=c++17 -pthread -D_WIN32_WINNT=0x0A00 -DHAS_MONGODB -I src\Backend -I "C:\vcpkg\installed\x64-windows\include" -I "C:\vcpkg\installed\x64-windows\include\mongocxx\v_noabi" -I "C:\vcpkg\installed\x64-windows\include\bsoncxx\v_noabi" src\Backend\main.cpp src\Backend\Server.cpp src\Backend\Cart.cpp src\Backend\LoginService.cpp src\Backend\PurchaseService.cpp src\Backend\PurchaseHistory.cpp src\Backend\SearchService.cpp src\Backend\SettingsService.cpp src\Backend\MongoDBService.cpp -L "C:\vcpkg\installed\x64-windows\lib" "C:\vcpkg\installed\x64-windows\lib\mongocxx-v_noabi-rhi-md.lib" "C:\vcpkg\installed\x64-windows\lib\bsoncxx-v_noabi-rhi-md.lib" "C:\vcpkg\installed\x64-windows\lib\mongoc-1.0.lib" "C:\vcpkg\installed\x64-windows\lib\bson-1.0.lib" -lws2_32 -lwsock32 -o backend.exe 2>build_errors.log
    if %ERRORLEVEL% NEQ 0 (
        echo Build failed! Check build_errors.log for details.
        type build_errors.log
        echo MongoDB build failed, trying without MongoDB...
        goto :skip_mongo
    )
    
    if exist backend.exe (
        echo.
        echo Build successful with MongoDB support! Run with: backend.exe
        REM Copy MongoDB DLLs if not already present
        if not exist mongocxx-v_noabi-rhi-md.dll (
            copy "C:\vcpkg\installed\x64-windows\bin\mongocxx-v_noabi-rhi-md.dll" . >nul 2>&1
            copy "C:\vcpkg\installed\x64-windows\bin\bsoncxx-v_noabi-rhi-md.dll" . >nul 2>&1
            copy "C:\vcpkg\installed\x64-windows\bin\mongoc-1.0.dll" . >nul 2>&1
            copy "C:\vcpkg\installed\x64-windows\bin\bson-1.0.dll" . >nul 2>&1
            echo MongoDB DLLs copied.
        )
        pause
        exit /b 0
    )
    :skip_mongo
    echo MongoDB build failed, trying without MongoDB...
)

REM Try g++ from PATH (without MongoDB)
echo Building without MongoDB support...
g++ -std=c++17 -pthread -D_WIN32_WINNT=0x0A00 -I src\Backend src\Backend\main.cpp src\Backend\Server.cpp src\Backend\Cart.cpp src\Backend\LoginService.cpp src\Backend\PurchaseService.cpp src\Backend\PurchaseHistory.cpp src\Backend\SearchService.cpp src\Backend\SettingsService.cpp src\Backend\MongoDBService.cpp -lws2_32 -lwsock32 -o backend.exe

if exist backend.exe (
    echo.
    echo Build successful! Run with: backend.exe
    pause
    exit /b 0
)

REM If MSVC is available and vcpkg provides MongoDB, try MSVC build with HAS_MONGODB defined
if defined MONGODB_AVAILABLE (
    echo Trying MSVC build with MongoDB support...
    cl /EHsc /std:c++17 /DHAS_MONGODB /I src\Backend ^
      /I "C:\vcpkg\installed\x64-windows\include" ^
      /I "C:\vcpkg\installed\x64-windows\include\mongocxx\v_noabi" ^
      /I "C:\vcpkg\installed\x64-windows\include\bsoncxx\v_noabi" ^
      src\Backend\main.cpp src\Backend\Server.cpp src\Backend\Cart.cpp src\Backend\LoginService.cpp ^
      src\Backend\PurchaseService.cpp src\Backend\PurchaseHistory.cpp src\Backend\SearchService.cpp ^
      src\Backend\SettingsService.cpp src\Backend\MongoDBService.cpp /link /LIBPATH:"C:\vcpkg\installed\x64-windows\lib" ^
      mongocxx-v_noabi-rhi-md.lib bsoncxx-v_noabi-rhi-md.lib mongoc-1.0.lib bson-1.0.lib ws2_32.lib wsock32.lib /OUT:backend.exe 2>nul

    if exist backend.exe (
        echo.
        echo Build successful with MongoDB support! Run with: backend.exe
        pause
        exit /b 0
    )
    echo MSVC MongoDB build failed, trying without MongoDB...
)

REM If g++ failed, try cl (MSVC)
echo g++ not available or build failed, trying MSVC...
cl /EHsc /std:c++17 /I src\Backend src\Backend\main.cpp src\Backend\Server.cpp src\Backend\Cart.cpp src\Backend\LoginService.cpp src\Backend\PurchaseService.cpp src\Backend\PurchaseHistory.cpp src\Backend\SearchService.cpp src\Backend\SettingsService.cpp src\Backend\MongoDBService.cpp /Fe:backend.exe 2>&1

if exist backend.exe (
    echo.
    echo Build successful! Run with: backend.exe
    pause
    exit /b 0
)

REM If both failed, show error message
echo.
echo ERROR: Build failed!
echo.
echo Please ensure you have a C++ compiler installed:
echo.
echo Option 1: MinGW-w64 (Recommended for Windows)
echo   Download from: https://www.mingw-w64.org/downloads/
echo   Or install via MSYS2: https://www.msys2.org/
echo   Add to PATH: C:\msys64\mingw64\bin
echo.
echo Option 2: Visual Studio Build Tools
echo   Download from: https://visualstudio.microsoft.com/downloads/
echo   Install "Desktop development with C++" workload
echo.
pause
exit /b 1

