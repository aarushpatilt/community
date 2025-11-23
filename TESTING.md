# Testing Guide

Quick reference for running tests in the Community Store project.

## Quick Start

**Run all tests:**
```powershell
cd tests
.\run_all_tests.ps1
```

**Run specific test:**
```powershell
cd tests
.\run_login_tests_simple.ps1    # Login tests
.\run_purchase_tests_simple.ps1  # Purchase tests
run_settings_tests.bat          # Settings tests
run_mongodb_tests.bat           # MongoDB tests
```

## Test Coverage

All backend services have test files:

✅ **LoginService** - `login_tests.cpp`, `logout_tests.cpp`  
✅ **PurchaseService** - `purchase_tests.cpp`  
✅ **PurchaseHistory** - `purchase_history_tests.cpp`  
✅ **Cart** - `cart_tests.cpp`  
✅ **SearchService** - `search_tests.cpp`  
✅ **SettingsService** - `settings_tests.cpp`  
✅ **MongoDBService** - `mongodb_tests.cpp`  

## Detailed Documentation

See [tests/README.md](tests/README.md) for complete testing documentation including:
- Prerequisites
- Individual test commands
- Test coverage details
- Troubleshooting
- Adding new tests

## Requirements

- C++ compiler (g++ or MSVC)
- Catch2 framework (included as `tests/catch.hpp`)
- MongoDB (optional, for MongoDB tests only)

