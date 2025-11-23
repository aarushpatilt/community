# Community Authentication System - C++ Backend

A C++-based authentication system with login/signup plus a cart and purchase history playground.

## Prerequisites

- C++17 compatible compiler (GCC, Clang, or MSVC)
- CMake 3.15+ (optional, for CMake builds)
- HTTP library: cpp-httplib (header-only, download required)
- JSON library: nlohmann/json (header-only, download required)

## Installation

1. Download required header files:

```bash
# Download cpp-httplib
curl -L https://github.com/yhirose/cpp-httplib/releases/download/v0.15.3/httplib.h -o src/Backend/httplib.h

# Download nlohmann/json
curl -L https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp -o src/Backend/json.hpp
```

2. Build the project:

**Using build script (Linux/Mac):**
```bash
chmod +x build.sh
./build.sh
```

**Using build script (Windows):**
```cmd
build.bat
```

**Using CMake:**
```bash
mkdir build
cd build
cmake ..
make
```

## Running the Application

1. Start the C++ backend server:
```bash
./backend        # Linux/Mac
backend.exe      # Windows
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Features

- **Sign Up / Login**: JWT-secured auth with field validation
- **Interactive Store**: Catalog browsing with live search, persistent carts, and checkout
- **Purchase History**: Orders capture shipping + payment summaries for future reference
- **Profile Editing**: Update username, email, display name, and bio from the settings panel
- **Session Controls**: Guided logout confirmation flow
- **Automated Tests**: C++ unit tests using Catch2 framework

## Project Structure

```
community/
├── src/Backend/          # C++ backend source code
│   ├── Server.cpp/h      # Main HTTP server
│   ├── Cart.cpp/h        # Shopping cart logic
│   ├── LoginService.cpp/h # Authentication logic
│   ├── PurchaseService.cpp/h # Purchase processing
│   ├── PurchaseHistory.cpp/h # Order history
│   ├── SearchService.cpp/h   # Catalog search
│   ├── SettingsService.cpp/h # Profile management
│   └── main.cpp          # Entry point
├── public/               # Frontend files (HTML, CSS, JS)
├── tests/                # C++ unit tests
├── build.sh / build.bat  # Build scripts
└── CMakeLists.txt       # CMake configuration
```

## API Endpoints

### Public Endpoints

- `POST /api/signup` - Create new user account
- `POST /api/login` - Login with credentials
- `GET /api/catalog` - Get product catalog
- `GET /api/search?q=<query>` - Search products
- `GET /api/health` - Health check

### Protected Endpoints (Require Authentication Token)

- `GET /api/me` - Get current user information
- `GET /api/cart` - Get shopping cart
- `POST /api/cart` - Add item to cart
- `PATCH /api/cart/:productId` - Update cart item quantity
- `DELETE /api/cart/:productId` - Remove item from cart
- `POST /api/cart/clear` - Clear entire cart
- `POST /api/cart/checkout` - Complete purchase
- `GET /api/purchase-history` - Get order history
- `PATCH /api/profile` - Update user profile

See `API_QUICK_REFERENCE.md` for detailed API documentation.

## Testing

### C++ Unit Tests

Run the C++ unit tests:

```bash
# Windows
cd tests
run_login_tests.bat
run_purchase_tests.bat

# Linux/Mac (compile and run manually)
g++ -std=c++17 tests/cart_tests.cpp src/Backend/Cart.cpp -I src/Backend -o test_cart
./test_cart
```

## Development

### Backend Architecture

The backend is implemented in C++ with the following components:

- **Server**: HTTP server handling all API requests
- **Cart**: In-memory shopping cart management
- **LoginService**: User authentication logic
- **PurchaseService**: Purchase processing and inventory
- **PurchaseHistory**: Order history tracking
- **SearchService**: Product catalog and search
- **SettingsService**: User profile management

### Frontend

The frontend is in the `public/` directory and communicates with the C++ backend via HTTP REST API. See `FRONTEND_INTEGRATION_GUIDE.md` for details on connecting a new frontend.

## Security Notes

- Change the `JWT_SECRET` in production
- Use environment variables for sensitive data
- Implement proper password hashing (bcrypt) in production
- Use HTTPS in production
- Add rate limiting for production

## Documentation

- `CPP_BACKEND_SETUP.md` - Complete setup guide for C++ backend
- `FRONTEND_INTEGRATION_GUIDE.md` - Guide for connecting frontends
- `API_QUICK_REFERENCE.md` - Quick API reference
