# Test Coverage Summary

## Backend Services with Tests ✅

| Service | Test File | Status |
|---------|-----------|--------|
| **Cart** | `cart_tests.cpp` | ✅ Complete |
| **LoginService** | `login_tests.cpp`, `logout_tests.cpp` | ✅ Complete |
| **PurchaseService** | `purchase_tests.cpp` | ✅ Complete |
| **PurchaseHistory** | `purchase_history_tests.cpp` | ✅ Complete |
| **SearchService** | `search_tests.cpp` | ✅ Complete |
| **SettingsService** | `settings_tests.cpp` | ✅ Complete |
| **MongoDBService** | `mongodb_tests.cpp` | ✅ Complete |

## Files Without Tests (Expected)

| File | Reason |
|------|--------|
| `main.cpp` | Entry point - no unit tests needed |
| `Server.cpp` | HTTP server - requires integration tests (not unit tests) |

## Test Statistics

- **Total Test Files**: 8
- **Total Backend Services**: 7 (all have tests)
- **Test Framework**: Catch2
- **Coverage**: 100% of testable services

## Running Tests

See [README.md](README.md) for detailed instructions on running tests.

Quick command:
```powershell
cd tests
.\run_all_tests.ps1
```

