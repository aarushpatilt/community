cmake_minimum_required(VERSION 3.15)
project(CommunityBackend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(src/Backend)

# Source files
set(SOURCES
    src/Backend/Server.cpp
    src/Backend/Cart.cpp
    src/Backend/LoginService.cpp
    src/Backend/PurchaseService.cpp
    src/Backend/PurchaseHistory.cpp
    src/Backend/SearchService.cpp
    src/Backend/SettingsService.cpp
)

# Create executable
add_executable(backend ${SOURCES})

# For HTTP server, you'll need to add a library:
# Option 1: cpp-httplib (header-only, download and include)
# Option 2: Crow (install via vcpkg or conan)
# Option 3: Boost.Beast (requires Boost)
# Option 4: Pistache

# Example with cpp-httplib (if you download it):
# target_include_directories(backend PRIVATE third_party/cpp-httplib)

