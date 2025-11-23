# Test Suite Documentation

This directory contains unit tests for all backend services in the Community Store application.

## Test Files

Each backend service has a corresponding test file:

| Backend Service | Test File | Description |
|----------------|-----------|-------------|
| `LoginService` | `login_tests.cpp` | Tests user authentication (login) |
| `LoginService` | `logout_tests.cpp` | Tests user logout functionality |
| `PurchaseService` | `purchase_tests.cpp` | Tests purchase/checkout operations |
| `PurchaseHistory` | `purchase_history_tests.cpp` | Tests purchase history retrieval |
| `Cart` | `cart_tests.cpp` | Tests shopping cart operations |
| `SearchService` | `search_tests.cpp` | Tests product search functionality |
| `SettingsService` | `settings_tests.cpp` | Tests user profile validation and updates |
| `MongoDBService` | `mongodb_tests.cpp` | Tests MongoDB connection and operations |

## Prerequisites

1. **C++ Compiler**: MinGW (g++) or MSVC
   - MinGW: Download from [mingw-w64.org](https://www.mingw-w64.org/)
   - Ensure `g++` is in your PATH

2. **Catch2 Framework**: Already included as `catch.hpp` in this directory

3. **MongoDB** (for MongoDB tests only):
   - MongoDB must be running for `mongodb_tests.cpp` to pass
   - Default connection: `mongodb://localhost:27017`
   - Tests will skip if MongoDB is unavailable

## Running Tests

### Option 1: Run All Tests (Recommended)

**Windows (PowerShell):**
```powershell
cd tests
.\run_all_tests.ps1
```

**Windows (Command Prompt):**
```cmd
cd tests
run_all_tests.bat
```

This will compile and run all test suites, showing a summary at the end.

### Option 2: Run Individual Test Suites

**Login Tests:**
```powershell
cd tests
.\run_login_tests_simple.ps1
```

**Purchase Tests:**
```powershell
cd tests
.\run_purchase_tests_simple.ps1
```

**Settings Tests:**
```cmd
cd tests
run_settings_tests.bat
```

**MongoDB Tests:**
```cmd
cd tests
run_mongodb_tests.bat
```

**Cart Tests:**
```cmd
cd tests
g++ -std=c++17 -I. -I../src/Backend cart_tests.cpp -o cart_tests.exe
.\cart_tests.exe
```

**Search Tests:**
```cmd
cd tests
g++ -std=c++17 -I. -I../src/Backend search_tests.cpp -o search_tests.exe
.\search_tests.exe
```

**Purchase History Tests:**
```cmd
cd tests
g++ -std=c++17 -I. -I../src/Backend purchase_history_tests.cpp -o purchase_history_tests.exe
.\purchase_history_tests.exe
```

**Logout Tests:**
```cmd
cd tests
g++ -std=c++17 -I. -I../src/Backend logout_tests.cpp -o logout_tests.exe
.\logout_tests.exe
```

### Option 3: Manual Compilation

For any test file, compile and run manually:

```cmd
cd tests
g++ -std=c++17 -I. -I../src/Backend <test_file>.cpp -o <test_file>.exe
.\<test_file>.exe
```

**Example:**
```cmd
g++ -std=c++17 -I. -I../src/Backend settings_tests.cpp -o settings_tests.exe
.\settings_tests.exe
```

## Test Coverage

### LoginService Tests
- ✅ Valid login with correct credentials
- ✅ Invalid login with wrong password
- ✅ Invalid login with non-existent user
- ✅ Username/email validation
- ✅ Password validation

### SettingsService Tests
- ✅ Username validation (3-30 characters)
- ✅ Email validation (format checking)
- ✅ Password validation (6-100 characters)
- ✅ Profile validation (fullName, bio)
- ✅ Token generation
- ✅ Password hashing

### MongoDBService Tests
- ✅ Connection state checking
- ✅ MongoDB connection (if available)
- ✅ User creation
- ✅ User lookup by username/email
- ✅ Graceful fallback when not connected

### Cart Tests
- ✅ Add items to cart
- ✅ Update item quantities
- ✅ Remove items from cart
- ✅ Calculate cart totals
- ✅ Clear cart

### Purchase Tests
- ✅ Create purchase orders
- ✅ Validate checkout data
- ✅ Process payment information
- ✅ Save purchase history

### Search Tests
- ✅ Search by product name
- ✅ Search by product ID
- ✅ Case-insensitive search
- ✅ Partial match search

## Understanding Test Output

### Successful Test Run
```
All tests passed (X assertions in Y test cases)
```

### Failed Test
```
FAILED:
  REQUIRE( result.valid == true )
with expansion:
  false == true
```

### Skipped Test (MongoDB)
```
MongoDB not available - skipping connection tests
```

## Troubleshooting

### Compilation Errors

**Error: `g++: command not found`**
- Install MinGW or add g++ to your PATH
- Verify with: `g++ --version`

**Error: `cannot find catch.hpp`**
- Ensure you're in the `tests/` directory
- Verify `catch.hpp` exists in the current directory

**Error: `cannot find ../src/Backend/...`**
- Ensure you're running from the `tests/` directory
- Verify the directory structure is correct

### Runtime Errors

**MongoDB tests fail:**
- Start MongoDB: `mongod` (or via service)
- Check connection: `mongodb://localhost:27017`
- Tests will skip if MongoDB is unavailable (this is expected)

**Tests pass but show warnings:**
- Some tests may show warnings for optional features
- Check the test output for specific details

## Adding New Tests

To add tests for a new backend service:

1. Create `new_service_tests.cpp` in the `tests/` directory
2. Include Catch2: `#define CATCH_CONFIG_MAIN` and `#include "catch.hpp"`
3. Include the service header: `#include "../src/Backend/NewService.h"`
4. Write test cases using `TEST_CASE()` and `SECTION()`
5. Add compilation command to `run_all_tests.bat` and `run_all_tests.ps1`

Example test structure:
```cpp
#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include "../src/Backend/NewService.h"

TEST_CASE("Service Functionality", "[service]") {
    NewService service;
    
    SECTION("Test case 1") {
        REQUIRE(service.method() == expected);
    }
}
```

## Continuous Integration

For CI/CD pipelines, use:
```bash
cd tests
g++ -std=c++17 -I. -I../src/Backend *_tests.cpp -o test_runner.exe
./test_runner.exe
```

Exit code 0 = all tests passed
Exit code non-zero = some tests failed

## Notes

- Test executables (`.exe` files) are automatically ignored by `.gitignore`
- Compilation logs are saved to `compile_*.log` files
- MongoDB tests require a running MongoDB instance
- Some tests may be skipped if dependencies are unavailable (this is expected behavior)
