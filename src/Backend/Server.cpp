/**
 * Main C++ HTTP Server
 * This replaces app.js and serves as the primary backend
 * 
 * To use: Download httplib.h and json.hpp (see CPP_BACKEND_SETUP.md)
 */

#include "Server.h"
#include "Cart.h"
#include "LoginService.h"
#include "PurchaseService.h"
#include "PurchaseHistory.h"
#include "SearchService.h"
#include "SettingsService.h"
#include "MongoDBService.h"
#include <iostream>
#include <sstream>
#include <map>
#include <algorithm>
#include <ctime>
#include <iomanip>
#include <fstream>

// Include HTTP and JSON libraries
#define HAS_HTTPLIB
#define HAS_JSON

#ifdef HAS_HTTPLIB
#include "httplib.h"
#endif

#ifdef HAS_JSON
#include "json.hpp"
using json = nlohmann::json;
#endif

// Simple JSON implementation (basic - replace with nlohmann/json for production)
namespace SimpleJSON {
    std::string escape(const std::string& str) {
        std::string result;
        for (char c : str) {
            if (c == '"') result += "\\\"";
            else if (c == '\\') result += "\\\\";
            else if (c == '\n') result += "\\n";
            else if (c == '\r') result += "\\r";
            else if (c == '\t') result += "\\t";
            else result += c;
        }
        return result;
    }

    std::string stringify(const std::map<std::string, std::string>& obj) {
        std::ostringstream oss;
        oss << "{";
        bool first = true;
        for (const auto& pair : obj) {
            if (!first) oss << ",";
            oss << "\"" << escape(pair.first) << "\":";
            // Check if value is a number
            if (pair.second.find_first_not_of("0123456789.-") == std::string::npos && !pair.second.empty()) {
                oss << pair.second;
            } else {
                oss << "\"" << escape(pair.second) << "\"";
            }
            first = false;
        }
        oss << "}";
        return oss.str();
    }

    std::string parseString(const std::string& json, const std::string& key) {
        std::string searchKey = "\"" + key + "\"";
        size_t pos = json.find(searchKey);
        if (pos == std::string::npos) return "";
        pos = json.find(":", pos);
        if (pos == std::string::npos) return "";
        // Skip whitespace
        while (pos < json.length() && (json[pos] == ' ' || json[pos] == ':')) pos++;
        if (pos >= json.length()) return "";
        
        if (json[pos] == '"') {
            // String value
            pos++;
            size_t end = json.find("\"", pos);
            if (end == std::string::npos) return "";
            return json.substr(pos, end - pos);
        } else {
            // Number or boolean
            size_t end = pos;
            while (end < json.length() && json[end] != ',' && json[end] != '}' && json[end] != ' ') end++;
            return json.substr(pos, end - pos);
        }
    }
}

// In-memory user storage (replace with MongoDB in production)
struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string password; // In production, hash this with bcrypt
    Cart cart;
    PurchaseHistory history;
    std::string fullName;
    std::string bio;
};

// Global state (in production, use database)
std::map<std::string, User> users; // username -> User (fallback if MongoDB not available)
std::map<std::string, std::string> tokens; // token -> userId (fallback if MongoDB not available)
PurchaseService purchaseService;
SearchService searchService;
SettingsService settingsService;
MongoDBService mongoService; // MongoDB service (optional)
std::string JWT_SECRET = "your-secret-key-change-in-production";

// Helper function to read MongoDB config from file
std::string readMongoConfig(const std::string& key, const std::string& defaultValue = "") {
    std::ifstream file("mongodb_config.txt");
    if (!file.is_open()) return defaultValue;
    
    std::string line;
    while (std::getline(file, line)) {
        // Skip comments and empty lines
        if (line.empty() || line[0] == '#') continue;
        
        size_t pos = line.find('=');
        if (pos != std::string::npos) {
            std::string configKey = line.substr(0, pos);
            std::string configValue = line.substr(pos + 1);
            
            // Trim whitespace
            configKey.erase(0, configKey.find_first_not_of(" \t"));
            configKey.erase(configKey.find_last_not_of(" \t") + 1);
            configValue.erase(0, configValue.find_first_not_of(" \t"));
            configValue.erase(configValue.find_last_not_of(" \t") + 1);
            
            if (configKey == key) {
                return configValue;
            }
        }
    }
    return defaultValue;
}

Server::Server(int port) : port(port) {
    // Try to connect to MongoDB
    std::string mongoConnStr = readMongoConfig("MONGODB_CONNECTION_STRING", "");
    std::string mongoDbName = readMongoConfig("MONGODB_DATABASE_NAME", "community_store");
    
    // If no config file, try default local MongoDB connection
    if (mongoConnStr.empty()) {
        mongoConnStr = "mongodb://localhost:27017";
        std::cout << "MongoDB: No config file found. Trying default local connection: " << mongoConnStr << std::endl;
    }
    
    if (!mongoConnStr.empty()) {
        // Replace <db_password> placeholder if present
        size_t pos = mongoConnStr.find("<db_password>");
        if (pos != std::string::npos) {
            std::cout << "WARNING: MongoDB connection string contains <db_password> placeholder." << std::endl;
            std::cout << "Please update mongodb_config.txt with your actual password." << std::endl;
            mongoConnStr = ""; // Don't try to connect with placeholder
        }
        
        if (!mongoConnStr.empty()) {
            std::cout << "Attempting to connect to MongoDB..." << std::endl;
            if (mongoService.connect(mongoConnStr, mongoDbName)) {
                std::cout << "✅ Connected to MongoDB successfully!" << std::endl;
            } else {
                std::cout << "⚠️  MongoDB connection failed. Using in-memory storage." << std::endl;
            }
        }
    } else {
        std::cout << "MongoDB: No connection string configured. Using in-memory storage." << std::endl;
        std::cout << "To enable MongoDB, create mongodb_config.txt with your connection string." << std::endl;
    }
    
    // Initialize with test users (only if MongoDB not connected)
    if (!mongoService.isConnected()) {
        User testUser;
        testUser.id = "1";
        testUser.username = "testuser";
        testUser.email = "test@example.com";
        testUser.password = "testpass";
        users["testuser"] = testUser;
    }
}

void Server::start() {
#ifdef HAS_HTTPLIB
    // Full HTTP server implementation using cpp-httplib
    httplib::Server svr;

    // CORS headers for all responses
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization"}
    });

    // Handle OPTIONS requests for CORS preflight
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        return;
    });

    // Serve static files from public directory
    svr.set_mount_point("/", "./public");

    // Health check
    svr.Get("/api/health", [this](const httplib::Request&, httplib::Response& res) {
        std::ostringstream oss;
        oss << "{\"success\":true,\"message\":\"Server is running\",\"port\":" << port << "}";
        res.set_content(oss.str(), "application/json");
    });

    // Public endpoints
    svr.Post("/api/signup", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_content(this->handleSignup(req.body), "application/json");
    });

    svr.Post("/api/login", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_content(this->handleLogin(req.body), "application/json");
    });

    svr.Get("/api/catalog", [this](const httplib::Request&, httplib::Response& res) {
        res.set_content(this->handleGetCatalog(), "application/json");
    });

    svr.Get("/api/search", [this](const httplib::Request& req, httplib::Response& res) {
        std::string query = req.get_param_value("q");
        res.set_content(this->handleSearch(query), "application/json");
    });

    // Protected endpoints - require authentication
    auto authenticate = [this](const httplib::Request& req) -> std::string {
        std::string authHeader = req.get_header_value("Authorization");
        if (authHeader.find("Bearer ") == 0) {
            std::string token = authHeader.substr(7);
            return this->getUserIdFromToken(token);
        }
        return "";
    };

    svr.Get("/api/me", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleGetProfile(userId), "application/json");
    });

    svr.Get("/api/cart", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleGetCart(userId), "application/json");
    });

    svr.Post("/api/cart", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.status = 201;
        res.set_content(this->handleAddToCart(req.body, userId), "application/json");
    });

    svr.Patch("/api/cart/.*", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        // Extract productId from path like /api/cart/ITEM001
        std::string path = req.path;
        size_t lastSlash = path.find_last_of('/');
        std::string productId = (lastSlash != std::string::npos) ? path.substr(lastSlash + 1) : "";
        std::string qtyStr = SimpleJSON::parseString(req.body, "quantity");
        unsigned int quantity = qtyStr.empty() ? 1 : std::stoi(qtyStr);
        res.set_content(this->handleUpdateCart(productId, quantity, userId), "application/json");
    });

    svr.Delete("/api/cart/.*", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        std::string path = req.path;
        size_t lastSlash = path.find_last_of('/');
        std::string productId = (lastSlash != std::string::npos) ? path.substr(lastSlash + 1) : "";
        res.set_content(this->handleRemoveFromCart(productId, userId), "application/json");
    });

    svr.Post("/api/cart/clear", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleClearCart(userId), "application/json");
    });

    svr.Post("/api/cart/checkout", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleCheckout(req.body, userId), "application/json");
    });

    svr.Get("/api/purchase-history", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleGetPurchaseHistory(userId), "application/json");
    });

    svr.Patch("/api/profile", [this, authenticate](const httplib::Request& req, httplib::Response& res) {
        std::string userId = authenticate(req);
        if (userId.empty()) {
            res.status = 401;
            res.set_content("{\"success\":false,\"message\":\"Access token required\"}", "application/json");
            return;
        }
        res.set_content(this->handleUpdateProfile(req.body, userId), "application/json");
    });

    std::cout << "========================================" << std::endl;
    std::cout << "C++ Backend Server Starting" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Server running on http://localhost:" << port << std::endl;
    std::cout << "Open http://localhost:" << port << " in your browser" << std::endl;
    std::cout << "========================================" << std::endl;
    
    svr.listen("0.0.0.0", port);
#else
    // Placeholder when httplib.h is not available
    std::cout << "========================================" << std::endl;
    std::cout << "C++ Backend Server" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Port: " << port << std::endl;
    std::cout << std::endl;
    std::cout << "ERROR: httplib.h not found!" << std::endl;
    std::cout << std::endl;
    std::cout << "To start the server, you need to:" << std::endl;
    std::cout << "1. Download httplib.h:" << std::endl;
    std::cout << "   https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h" << std::endl;
    std::cout << "   Save it to: src/Backend/httplib.h" << std::endl;
    std::cout << std::endl;
    std::cout << "2. Uncomment the #include in Server.cpp (line 23)" << std::endl;
    std::cout << std::endl;
    std::cout << "3. Rebuild the project" << std::endl;
    std::cout << std::endl;
    std::cout << "See HOW_TO_START.md for detailed instructions." << std::endl;
    std::cout << "========================================" << std::endl;
#endif
}

std::string Server::getUserIdFromToken(const std::string& token) {
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        std::string userId = mongoService.getUserIdFromToken(token);
        if (!userId.empty()) {
            std::cerr << "Server getUserIdFromToken: Found userId '" << userId << "' from MongoDB" << std::endl;
            return userId;
        } else {
            std::cerr << "Server getUserIdFromToken: MongoDB lookup returned empty, trying in-memory fallback" << std::endl;
        }
    } else {
        std::cerr << "Server getUserIdFromToken: MongoDB not connected, using in-memory storage" << std::endl;
    }
    
    // Fallback to in-memory storage
    if (tokens.find(token) != tokens.end()) {
        std::cerr << "Server getUserIdFromToken: Found userId from in-memory storage" << std::endl;
        return tokens[token];
    }
    
    std::cerr << "Server getUserIdFromToken: Token not found in MongoDB or in-memory storage" << std::endl;
    return "";
}

std::string Server::handleSignup(const std::string& body) {
    std::string username = SimpleJSON::parseString(body, "username");
    std::string email = SimpleJSON::parseString(body, "email");
    std::string password = SimpleJSON::parseString(body, "password");

    if (username.empty() || email.empty() || password.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Username, email, and password are required";
        return SimpleJSON::stringify(response);
    }

    if (password.length() < 6) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Password must be at least 6 characters long";
        return SimpleJSON::stringify(response);
    }

    // Use MongoDB if connected, otherwise use in-memory storage
    if (mongoService.isConnected()) {
        // Check if username already exists in MongoDB
        User existingUser;
        if (mongoService.findUserByUsername(username, existingUser)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Username already exists";
            return SimpleJSON::stringify(response);
        }
        
        // Normalize email: trim whitespace and convert to lowercase
        std::string normalizedEmail = email;
        // Trim leading/trailing whitespace
        normalizedEmail.erase(0, normalizedEmail.find_first_not_of(" \t\n\r"));
        normalizedEmail.erase(normalizedEmail.find_last_not_of(" \t\n\r") + 1);
        // Convert to lowercase
        std::transform(normalizedEmail.begin(), normalizedEmail.end(), normalizedEmail.begin(), ::tolower);
        
        std::cerr << "Server handleSignup: Checking for email '" << normalizedEmail << "' (original: '" << email << "')" << std::endl;
        
        // Check if email already exists - use simple exists check (faster and more reliable)
        if (mongoService.emailExists(normalizedEmail)) {
            std::cerr << "Server handleSignup: Email '" << normalizedEmail << "' already exists (blocking signup)" << std::endl;
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Email already exists";
            return SimpleJSON::stringify(response);
        }
        
        // Double-check with findUserByEmail as backup
        if (mongoService.findUserByEmail(normalizedEmail, existingUser)) {
            std::cerr << "Server handleSignup: Email '" << normalizedEmail << "' already exists (found via findUserByEmail backup check)" << std::endl;
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Email already exists";
            return SimpleJSON::stringify(response);
        }
        
        std::cerr << "Server handleSignup: Email '" << normalizedEmail << "' not found, proceeding to create user" << std::endl;
        
        // Create user in MongoDB (it also checks for duplicates internally with multiple methods)
        std::string userId = std::to_string(time(nullptr)) + "_" + username;
        if (!mongoService.createUser(username, normalizedEmail, password, userId)) {
            // If createUser failed, check what the reason was
            // Re-check email (most likely cause of failure)
            if (mongoService.findUserByEmail(normalizedEmail, existingUser)) {
                std::map<std::string, std::string> response;
                response["success"] = "false";
                response["message"] = "Email already exists";
                return SimpleJSON::stringify(response);
            }
            // Check username
            if (mongoService.findUserByUsername(username, existingUser)) {
                std::map<std::string, std::string> response;
                response["success"] = "false";
                response["message"] = "Username already exists";
                return SimpleJSON::stringify(response);
            }
            // Generic failure
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Failed to create user. Please try again.";
            return SimpleJSON::stringify(response);
        }
        
        // Generate token and save to MongoDB
        std::string token = "token_" + username + "_" + std::to_string(time(nullptr));
        if (mongoService.isConnected()) {
            mongoService.saveToken(token, userId);
        }
        // Also save to in-memory as fallback
        tokens[token] = userId;
        
        // Build response
        User newUser;
        newUser.id = userId;
        newUser.username = username;
        newUser.email = email;
        
#ifdef HAS_JSON
        json response;
        response["success"] = true;
        response["message"] = "User created successfully";
        response["token"] = token;
        response["user"] = json::object();
        response["user"]["id"] = userId;
        response["user"]["username"] = username;
        response["user"]["email"] = email;
        return response.dump();
#else
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["message"] = "User created successfully";
        response["token"] = token;
        response["user_id"] = userId;
        response["username"] = username;
        response["email"] = email;
        return SimpleJSON::stringify(response);
#endif
    } else {
        // In-memory storage fallback
    if (users.find(username) != users.end()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Username already exists";
        return SimpleJSON::stringify(response);
    }

        // Check if email exists (case-insensitive)
        std::string lowerEmail = email;
        std::transform(lowerEmail.begin(), lowerEmail.end(), lowerEmail.begin(), ::tolower);
    for (const auto& pair : users) {
            std::string existingLower = pair.second.email;
            std::transform(existingLower.begin(), existingLower.end(), existingLower.begin(), ::tolower);
            if (existingLower == lowerEmail) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Email already exists";
            return SimpleJSON::stringify(response);
        }
    }

    // Create new user
    User newUser;
    newUser.id = std::to_string(users.size() + 1);
    newUser.username = username;
    newUser.email = email;
    newUser.password = password; // TODO: Hash with bcrypt in production
    users[username] = newUser;

    // Generate token (simplified - use JWT library in production)
    std::string token = "token_" + username + "_" + std::to_string(time(nullptr));
    tokens[token] = newUser.id;

#ifdef HAS_JSON
    // Use nlohmann/json for nested user object
    json response;
    response["success"] = true;
    response["message"] = "User created successfully";
    response["token"] = token;
    response["user"] = json::object();
    response["user"]["id"] = newUser.id;
    response["user"]["username"] = username;
    response["user"]["email"] = email;
    return response.dump();
#else
    // Fallback to SimpleJSON (flat structure)
    std::map<std::string, std::string> response;
    response["success"] = "true";
    response["message"] = "User created successfully";
    response["token"] = token;
    response["user_id"] = newUser.id;
    response["username"] = username;
    response["email"] = email;
    return SimpleJSON::stringify(response);
#endif
    }
}

std::string Server::handleLogin(const std::string& body) {
    std::string username = SimpleJSON::parseString(body, "username");
    std::string password = SimpleJSON::parseString(body, "password");

    if (username.empty() || password.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Username and password are required";
        return SimpleJSON::stringify(response);
    }

    // Use MongoDB if connected, otherwise use in-memory storage
    if (mongoService.isConnected()) {
        User user;
        bool found = false;
        
        // Try username first
        if (mongoService.findUserByUsername(username, user)) {
            found = true;
        } else {
            // If not found by username, try as email
            // Check if input looks like an email (contains @)
            if (username.find('@') != std::string::npos) {
                // Normalize email: trim whitespace and convert to lowercase
                std::string normalizedEmail = username;
                normalizedEmail.erase(0, normalizedEmail.find_first_not_of(" \t\n\r"));
                normalizedEmail.erase(normalizedEmail.find_last_not_of(" \t\n\r") + 1);
                std::transform(normalizedEmail.begin(), normalizedEmail.end(), normalizedEmail.begin(), ::tolower);
                
                // Try to find user by email
                if (mongoService.findUserByEmail(normalizedEmail, user)) {
                    found = true;
                }
            }
        }
        
        if (found && user.password == password) {
            // Generate token and save to MongoDB
            std::string token = "token_" + user.username + "_" + std::to_string(time(nullptr));
            if (mongoService.isConnected()) {
                mongoService.saveToken(token, user.id);
            }
            // Also save to in-memory as fallback
            tokens[token] = user.id;
            
#ifdef HAS_JSON
            json response;
            response["success"] = true;
            response["message"] = "Login successful";
            response["token"] = token;
            response["user"] = json::object();
            response["user"]["id"] = user.id;
            response["user"]["username"] = user.username;
            response["user"]["email"] = user.email;
            return response.dump();
#else
            std::map<std::string, std::string> response;
            response["success"] = "true";
            response["message"] = "Login successful";
            response["token"] = token;
            response["user_id"] = user.id;
            response["username"] = user.username;
            response["email"] = user.email;
            return SimpleJSON::stringify(response);
#endif
        }
        
        // Login failed
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Invalid username or password";
        return SimpleJSON::stringify(response);
    } else {
        // In-memory storage fallback
    // Try LoginService first (for test users)
    LoginService loginService;
    LoginResult result = loginService.authenticate(username, password);

    // Also check database users
    if (!result.success && users.find(username) != users.end()) {
        if (users[username].password == password) {
            result.success = true;
            result.message = "Login successful";
            result.username = username;
        }
    }

    if (result.success) {
        // Generate token
        std::string token = "token_" + username + "_" + std::to_string(time(nullptr));
        std::string userId = result.username;
        std::string email = "";
        if (users.find(username) != users.end()) {
            userId = users[username].id;
            email = users[username].email;
        }

        tokens[token] = userId;

#ifdef HAS_JSON
        // Use nlohmann/json for nested user object
        json response;
        response["success"] = true;
        response["message"] = result.message;
        response["token"] = token;
        response["user"] = json::object();
        response["user"]["id"] = userId;
        response["user"]["username"] = result.username;
        if (!email.empty()) {
            response["user"]["email"] = email;
        }
        return response.dump();
#else
        // Fallback to SimpleJSON (flat structure)
        std::map<std::string, std::string> response;
        response["success"] = "true";
        response["message"] = result.message;
        response["token"] = token;
        response["user_id"] = userId;
        response["username"] = result.username;
        if (!email.empty()) {
            response["email"] = email;
        }
        return SimpleJSON::stringify(response);
#endif
    } else {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = result.message;
        return SimpleJSON::stringify(response);
        }
    }
}

std::string Server::handleGetCart(const std::string& userId) {
    if (userId.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Invalid user ID";
        return SimpleJSON::stringify(response);
    }
    
    User user;
    bool found = false;
    
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        found = mongoService.findUserById(userId, user);
        if (!found) {
            std::cerr << "handleGetCart: User not found in MongoDB for userId: " << userId << std::endl;
        }
    } else {
        // In-memory storage fallback
    for (auto& pair : users) {
        if (pair.second.id == userId) {
                user = pair.second;
                found = true;
            break;
            }
        }
    }

    if (!found) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    // Build cart response
    std::ostringstream oss;
    oss << "{\"success\":true,\"cart\":[";
    bool first = true;
    for (const auto& item : user.cart.getItems()) {
        if (!first) oss << ",";
        oss << "{\"productId\":\"" << item.productId
            << "\",\"name\":\"" << SimpleJSON::escape(item.name)
            << "\",\"price\":" << item.price
            << ",\"quantity\":" << item.quantity << "}";
        first = false;
    }
    oss << "],\"total\":" << std::fixed << std::setprecision(2) << user.cart.getTotal() << "}";
    return oss.str();
}

std::string Server::handleAddToCart(const std::string& body, const std::string& userId) {
    std::string productId = SimpleJSON::parseString(body, "productId");
    std::string qtyStr = SimpleJSON::parseString(body, "quantity");
    unsigned int quantity = qtyStr.empty() ? 1 : std::stoi(qtyStr);
    if (quantity < 1) quantity = 1;
    if (quantity > 99) quantity = 99;

    // Get product from search service (catalog)
    const CatalogItem* product = searchService.getItemById(productId);
    if (!product) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Product not found";
        return SimpleJSON::stringify(response);
    }

    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        User user;
        if (!mongoService.findUserById(userId, user)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "User not found";
            return SimpleJSON::stringify(response);
        }
        
        // Add to cart
        CartItem cartItem(productId, product->name, product->price, quantity);
        user.cart.addItem(cartItem);
        
        // Save cart to MongoDB
        std::vector<CartItem> cartItems = user.cart.getItems();
        mongoService.updateCart(userId, cartItems);
    } else {
        // In-memory storage fallback
    User* user = nullptr;
    for (auto& pair : users) {
        if (pair.second.id == userId) {
            user = &pair.second;
            break;
        }
    }

    if (!user) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    // Add to cart
    CartItem cartItem(productId, product->name, product->price, quantity);
    user->cart.addItem(cartItem);
    }

    return handleGetCart(userId);
}

std::string Server::handleUpdateCart(const std::string& productId, unsigned int quantity, const std::string& userId) {
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        User user;
        if (!mongoService.findUserById(userId, user)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "User not found";
            return SimpleJSON::stringify(response);
        }

        if (!user.cart.updateQuantity(productId, quantity)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Item not found in cart";
            return SimpleJSON::stringify(response);
        }
        
        // Save cart to MongoDB
        std::vector<CartItem> cartItems = user.cart.getItems();
        mongoService.updateCart(userId, cartItems);
    } else {
        // In-memory storage fallback
    User* user = nullptr;
    for (auto& pair : users) {
        if (pair.second.id == userId) {
            user = &pair.second;
            break;
        }
    }

    if (!user) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    if (!user->cart.updateQuantity(productId, quantity)) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Item not found in cart";
        return SimpleJSON::stringify(response);
        }
    }

    return handleGetCart(userId);
}

std::string Server::handleRemoveFromCart(const std::string& productId, const std::string& userId) {
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        User user;
        if (!mongoService.findUserById(userId, user)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "User not found";
            return SimpleJSON::stringify(response);
        }

        if (!user.cart.removeItem(productId)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Item not found in cart";
            return SimpleJSON::stringify(response);
        }
        
        // Save cart to MongoDB
        std::vector<CartItem> cartItems = user.cart.getItems();
        mongoService.updateCart(userId, cartItems);
    } else {
        // In-memory storage fallback
    User* user = nullptr;
    for (auto& pair : users) {
        if (pair.second.id == userId) {
            user = &pair.second;
            break;
        }
    }

    if (!user) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    if (!user->cart.removeItem(productId)) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Item not found in cart";
        return SimpleJSON::stringify(response);
        }
    }

    return handleGetCart(userId);
}

std::string Server::handleClearCart(const std::string& userId) {
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        mongoService.clearCart(userId);
    } else {
        // In-memory storage fallback
    User* user = nullptr;
    for (auto& pair : users) {
        if (pair.second.id == userId) {
            user = &pair.second;
            break;
        }
    }

    if (!user) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    user->cart.clear();
    }
    
    return "{\"success\":true,\"cart\":[],\"total\":0}";
}

std::string Server::handleGetCatalog() {
    std::ostringstream oss;
    oss << "{\"success\":true,\"items\":[";
    auto items = purchaseService.getAvailableItems();
    bool first = true;
    for (const auto& item : items) {
        if (!first) oss << ",";
        oss << "{\"id\":\"" << item.id
            << "\",\"name\":\"" << SimpleJSON::escape(item.name)
            << "\",\"price\":" << item.price
            << ",\"description\":\"\"}";
        first = false;
    }
    oss << "]}";
    return oss.str();
}

std::string Server::handleSearch(const std::string& query) {
    if (query.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Search query is required";
        return SimpleJSON::stringify(response);
    }

    std::ostringstream oss;
    oss << "{\"success\":true,\"query\":\"" << SimpleJSON::escape(query) << "\",\"results\":[";
    auto results = searchService.searchCatalog(query);
    bool first = true;
    
    for (const auto& item : results) {
        if (!first) oss << ",";
        oss << "{\"id\":\"" << item.id
            << "\",\"name\":\"" << SimpleJSON::escape(item.name)
            << "\",\"price\":" << item.price
            << ",\"description\":\"" << SimpleJSON::escape(item.description) << "\"}";
        first = false;
    }
    oss << "]}";
    return oss.str();
}

std::string Server::handleGetPurchaseHistory(const std::string& userId) {
    std::cerr << "Server handleGetPurchaseHistory: Requested for userId: " << userId << std::endl;
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        std::cerr << "Server handleGetPurchaseHistory: MongoDB is connected" << std::endl;
        std::vector<std::string> historyJson;
        if (mongoService.getPurchaseHistory(userId, historyJson)) {
            std::cerr << "Server handleGetPurchaseHistory: Got " << historyJson.size() << " orders from MongoDB" << std::endl;
            if (!historyJson.empty()) {
                // Transform MongoDB order format to frontend-expected format
#ifdef HAS_JSON
                json response;
                response["success"] = true;
                response["history"] = json::array();
                
                for (const auto& orderJson : historyJson) {
                    try {
                        json mongoOrder = json::parse(orderJson);
                        json frontendOrder;
                        
                        // Transform MongoDB fields to frontend format
                        // MongoDB: _id, userId, items, total, timestamp
                        // Frontend expects: orderId, purchasedAt, items, total
                        if (mongoOrder.contains("_id")) {
                            if (mongoOrder["_id"].is_string()) {
                                frontendOrder["orderId"] = mongoOrder["_id"].get<std::string>();
                            } else if (mongoOrder["_id"].is_object() && mongoOrder["_id"].contains("$oid")) {
                                // MongoDB ObjectId in extended JSON format
                                frontendOrder["orderId"] = mongoOrder["_id"]["$oid"].get<std::string>();
                            } else {
                                frontendOrder["orderId"] = mongoOrder["_id"].dump();
                            }
                        } else {
                            frontendOrder["orderId"] = "ORD_" + userId + "_" + std::to_string(time(nullptr));
                        }
                        
                        // Convert timestamp to purchasedAt (MongoDB date format)
                        if (mongoOrder.contains("timestamp")) {
                            if (mongoOrder["timestamp"].is_string()) {
                                // ISO string format
                                frontendOrder["purchasedAt"] = mongoOrder["timestamp"];
                            } else if (mongoOrder["timestamp"].is_object() && mongoOrder["timestamp"].contains("$date")) {
                                // MongoDB extended JSON format: {"$date": "ISO-string"} or {"$date": number}
                                auto dateValue = mongoOrder["timestamp"]["$date"];
                                if (dateValue.is_string()) {
                                    frontendOrder["purchasedAt"] = dateValue.get<std::string>();
                                } else if (dateValue.is_number()) {
                                    // Unix timestamp in milliseconds
                                    frontendOrder["purchasedAt"] = dateValue.get<int64_t>();
                                } else {
                                    frontendOrder["purchasedAt"] = std::to_string(time(nullptr) * 1000);
                                }
                            } else if (mongoOrder["timestamp"].is_number()) {
                                // Direct timestamp number
                                frontendOrder["purchasedAt"] = mongoOrder["timestamp"].get<int64_t>();
                            } else {
                                // Fallback to current time
                                frontendOrder["purchasedAt"] = std::to_string(time(nullptr) * 1000); // milliseconds
                            }
                        } else {
                            frontendOrder["purchasedAt"] = std::to_string(time(nullptr) * 1000); // milliseconds
                        }
                        
                        // Transform items array to frontend format
                        if (mongoOrder.contains("items") && mongoOrder["items"].is_array()) {
                            json itemsArray = json::array();
                            for (const auto& item : mongoOrder["items"]) {
                                json frontendItem;
                                // Prefer productId, fallback to id
                                if (item.contains("productId")) {
                                    frontendItem["productId"] = item["productId"];
                                } else if (item.contains("id")) {
                                    frontendItem["productId"] = item["id"];
                                }
                                if (item.contains("name")) frontendItem["name"] = item["name"];
                                if (item.contains("price")) frontendItem["price"] = item["price"];
                                if (item.contains("quantity")) frontendItem["quantity"] = item["quantity"];
                                // Use subtotal if available, otherwise calculate
                                if (item.contains("subtotal")) {
                                    frontendItem["subtotal"] = item["subtotal"];
                                } else if (item.contains("price") && item.contains("quantity")) {
                                    double price = item["price"].is_number() ? item["price"].get<double>() : 0.0;
                                    int qty = item["quantity"].is_number() ? item["quantity"].get<int>() : 0;
                                    frontendItem["subtotal"] = price * qty;
                                }
                                itemsArray.push_back(frontendItem);
                            }
                            frontendOrder["items"] = itemsArray;
                        } else {
                            frontendOrder["items"] = json::array();
                        }
                        
                        // Copy total
                        if (mongoOrder.contains("total")) {
                            frontendOrder["total"] = mongoOrder["total"];
                        } else {
                            frontendOrder["total"] = 0.0;
                        }
                        
                        response["history"].push_back(frontendOrder);
                    } catch (const std::exception& e) {
                        std::cerr << "Error parsing order JSON: " << e.what() << std::endl;
                        std::cerr << "Order JSON was: " << orderJson << std::endl;
                        // Skip invalid JSON
                    }
                }
                
                // Always return valid JSON even if history is empty
                if (response["history"].empty()) {
                    std::cerr << "Warning: Purchase history is empty for user: " << userId << std::endl;
                }
                return response.dump();
#else
                // Fallback: combine JSON strings manually (basic transformation)
                std::ostringstream oss;
                oss << "{\"success\":true,\"history\":[";
                bool first = true;
                for (const auto& orderJson : historyJson) {
                    if (!first) oss << ",";
                    // Basic transformation - convert _id to orderId, timestamp to purchasedAt
                    std::string transformed = orderJson;
                    // Simple string replacements for basic format
                    size_t pos = 0;
                    while ((pos = transformed.find("\"_id\"", pos)) != std::string::npos) {
                        transformed.replace(pos, 5, "\"orderId\"");
                        pos += 7;
                    }
                    pos = 0;
                    while ((pos = transformed.find("\"timestamp\"", pos)) != std::string::npos) {
                        transformed.replace(pos, 11, "\"purchasedAt\"");
                        pos += 12;
                    }
                    oss << transformed;
                    first = false;
                }
                oss << "]}";
                return oss.str();
#endif
            } else {
                // No history found but query succeeded
                std::cerr << "Info: No purchase history found for user: " << userId << std::endl;
            }
        } else {
            std::cerr << "Error: Failed to get purchase history for user: " << userId << std::endl;
        }
        return "{\"success\":true,\"history\":[]}";
    }
    
    // In-memory storage fallback
    User* user = nullptr;
    for (auto& pair : users) {
        if (pair.second.id == userId) {
            user = &pair.second;
            break;
        }
    }

    if (!user) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

#ifdef HAS_JSON
    // Get purchase history
    const auto& purchases = user->history.getPurchases();
    
    json response;
    response["success"] = true;
    response["history"] = json::array();
    
    // Group purchases by order (for now, treat all as one order)
    // In production with MongoDB, we'd have proper order documents
    if (!purchases.empty()) {
        json order;
        order["orderId"] = "ORD_" + userId + "_" + std::to_string(time(nullptr));
        order["purchasedAt"] = std::to_string(time(nullptr));
        order["items"] = json::array();
        double total = 0.0;
        
        for (const auto& purchase : purchases) {
            json item;
            item["productId"] = purchase.id;
            item["name"] = purchase.name;
            item["price"] = purchase.price;
            item["quantity"] = purchase.quantity;
            order["items"].push_back(item);
            total += purchase.subtotal();
        }
        
        order["total"] = total;
        response["history"].push_back(order);
    }
    
    return response.dump();
#else
    // Fallback for SimpleJSON
    std::ostringstream oss;
    oss << "{\"success\":true,\"history\":[]}";
    return oss.str();
#endif
}

std::string Server::handleCheckout(const std::string& body, const std::string& userId) {
    User user;
    bool found = false;
    
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        found = mongoService.findUserById(userId, user);
    } else {
        // In-memory storage fallback
    for (auto& pair : users) {
        if (pair.second.id == userId) {
                user = pair.second;
                found = true;
            break;
            }
        }
    }

    if (!found) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    // Check if cart is empty
    if (user.cart.isEmpty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Cart is empty";
        return SimpleJSON::stringify(response);
    }

#ifdef HAS_JSON
    // Parse checkout request body
    json checkoutData;
    try {
        checkoutData = json::parse(body);
    } catch (...) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Invalid request data";
        return SimpleJSON::stringify(response);
    }

    // Validate required fields
    if (!checkoutData.contains("shippingAddress") || !checkoutData.contains("paymentMethod")) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "Shipping address and payment method are required";
        return SimpleJSON::stringify(response);
    }

    // Generate order ID
    std::string orderId = "ORD_" + userId + "_" + std::to_string(time(nullptr));

    // Get cart items
    const auto& cartItems = user.cart.getItems();
    double total = user.cart.getTotal();

    // Create purchase records for history
    std::vector<PurchaseRecord> purchaseRecords;
    for (const auto& item : cartItems) {
        purchaseRecords.push_back(PurchaseRecord(item.productId, item.name, item.price, item.quantity));
    }

    // Save to MongoDB if connected
    if (mongoService.isConnected()) {
        // Save purchase to MongoDB (this also updates user history)
        bool purchaseSaved = mongoService.addPurchase(userId, purchaseRecords, orderId, total);
        if (!purchaseSaved) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Failed to save purchase";
            return SimpleJSON::stringify(response);
        }
        
        // Clear cart in MongoDB
        bool cartCleared = mongoService.clearCart(userId);
        if (!cartCleared) {
            std::cerr << "Warning: Failed to clear cart after checkout" << std::endl;
        }
    } else {
        // In-memory storage fallback
    // Record purchases in history
        user.history.recordPurchases(purchaseRecords);

    // Clear cart
        user.cart.clear();
        
        // Update in-memory user
        for (auto& pair : users) {
            if (pair.second.id == userId) {
                pair.second = user;
                break;
            }
        }
    }

    // Build response with order details
    json response;
    response["success"] = true;
    response["message"] = "Checkout successful";
    response["order"] = json::object();
    response["order"]["orderId"] = orderId;
    response["order"]["purchasedAt"] = std::to_string(time(nullptr));
    response["order"]["total"] = total;
    response["order"]["items"] = json::array();
    
    for (const auto& item : cartItems) {
        json orderItem;
        orderItem["productId"] = item.productId;
        orderItem["name"] = item.name;
        orderItem["price"] = item.price;
        orderItem["quantity"] = item.quantity;
        response["order"]["items"].push_back(orderItem);
    }

    // Add shipping address (sanitized - don't store full payment details)
    response["order"]["shippingAddress"] = checkoutData["shippingAddress"];
    
    // Add payment summary (masked card number)
    json paymentSummary = json::object();
    if (checkoutData["paymentMethod"].contains("cardNumber")) {
        std::string cardNum = checkoutData["paymentMethod"]["cardNumber"];
        if (cardNum.length() > 4) {
            paymentSummary["last4"] = cardNum.substr(cardNum.length() - 4);
        }
    }
    if (checkoutData["paymentMethod"].contains("cardholderName")) {
        paymentSummary["cardholderName"] = checkoutData["paymentMethod"]["cardholderName"];
    }
    response["order"]["paymentSummary"] = paymentSummary;

    return response.dump();
#else
    // Fallback for SimpleJSON - basic implementation
    std::map<std::string, std::string> response;
    response["success"] = "false";
    response["message"] = "Checkout requires JSON library support";
    return SimpleJSON::stringify(response);
#endif
}

std::string Server::handleGetProfile(const std::string& userId) {
    User user;
    bool found = false;
    
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        found = mongoService.findUserById(userId, user);
    } else {
        // In-memory storage fallback
    for (auto& pair : users) {
        if (pair.second.id == userId) {
                user = pair.second;
                found = true;
            break;
            }
        }
    }

    if (!found) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    std::ostringstream oss;
    oss << "{\"success\":true,\"user\":{"
        << "\"id\":\"" << user.id << "\","
        << "\"username\":\"" << user.username << "\","
        << "\"email\":\"" << user.email << "\"";
    if (!user.fullName.empty()) {
        oss << ",\"profile\":{\"fullName\":\"" << SimpleJSON::escape(user.fullName) << "\"";
        if (!user.bio.empty()) {
            oss << ",\"bio\":\"" << SimpleJSON::escape(user.bio) << "\"";
        }
        oss << "}";
    }
    oss << "}}";
    return oss.str();
}

std::string Server::handleUpdateProfile(const std::string& body, const std::string& userId) {
    User user;
    bool found = false;
    
    // Use MongoDB if connected
    if (mongoService.isConnected()) {
        found = mongoService.findUserById(userId, user);
    } else {
        // In-memory storage fallback
    for (auto& pair : users) {
        if (pair.second.id == userId) {
                user = pair.second;
                found = true;
            break;
            }
        }
    }

    if (!found) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "User not found";
        return SimpleJSON::stringify(response);
    }

    // Parse request body
    std::string username = SimpleJSON::parseString(body, "username");
    std::string email = SimpleJSON::parseString(body, "email");
    std::string password = SimpleJSON::parseString(body, "password");
    std::string fullName = SimpleJSON::parseString(body, "fullName");
    std::string bio = SimpleJSON::parseString(body, "bio");

    std::vector<std::string> errors;
    bool hasUpdates = false;

    // Validate and prepare username update
    if (!username.empty() && username != user.username) {
        auto validation = settingsService.validateUsername(username);
        if (!validation.valid) {
            errors.push_back(validation.error);
        } else {
            // Check if username already exists (MongoDB or in-memory)
            bool usernameExists = false;
            if (mongoService.isConnected()) {
                User existingUser;
                if (mongoService.findUserByUsername(validation.value, existingUser) && existingUser.id != userId) {
                    usernameExists = true;
                }
            } else {
            if (users.find(validation.value) != users.end() && users[validation.value].id != userId) {
                    usernameExists = true;
                }
            }
            if (usernameExists) {
                errors.push_back("Username already taken");
            } else {
                user.username = validation.value;
                hasUpdates = true;
            }
        }
    }

    // Validate and prepare email update
    if (!email.empty() && email != user.email) {
        auto validation = settingsService.validateEmail(email);
        if (!validation.valid) {
            errors.push_back(validation.error);
        } else {
            // Check if email already exists (MongoDB or in-memory)
            // Use case-insensitive comparison
            bool emailExists = false;
            if (mongoService.isConnected()) {
                User existingUser;
                if (mongoService.findUserByEmail(validation.value, existingUser) && existingUser.id != userId) {
                    emailExists = true;
                }
            } else {
                // Case-insensitive email comparison for in-memory storage
                std::string lowerEmail = validation.value;
                std::transform(lowerEmail.begin(), lowerEmail.end(), lowerEmail.begin(), ::tolower);
            for (const auto& pair : users) {
                    std::string existingLower = pair.second.email;
                    std::transform(existingLower.begin(), existingLower.end(), existingLower.begin(), ::tolower);
                    if (existingLower == lowerEmail && pair.second.id != userId) {
                    emailExists = true;
                    break;
                    }
                }
            }
            if (emailExists) {
                errors.push_back("Email already taken");
            } else {
                user.email = validation.value;
                hasUpdates = true;
            }
        }
    }

    // Validate and prepare password update
    if (!password.empty()) {
        auto validation = settingsService.validatePassword(password);
        if (!validation.valid) {
            errors.push_back(validation.error);
        } else {
            // Hash password (in production, use bcrypt)
            user.password = settingsService.hashPassword(validation.value);
            hasUpdates = true;
        }
    }

    // Validate and prepare profile fields
    if (!fullName.empty() || !bio.empty()) {
        auto validation = settingsService.validateProfile(fullName, bio);
        if (!validation.valid) {
            errors.push_back(validation.error);
        } else {
            if (!fullName.empty()) {
                user.fullName = fullName;
                hasUpdates = true;
            }
            if (!bio.empty()) {
                user.bio = bio;
                hasUpdates = true;
            }
        }
    }

    // Return errors if any
    if (!errors.empty()) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = errors[0]; // Return first error
        return SimpleJSON::stringify(response);
    }

    // Check if there are any updates
    if (!hasUpdates) {
        std::map<std::string, std::string> response;
        response["success"] = "false";
        response["message"] = "No profile changes detected";
        return SimpleJSON::stringify(response);
    }

    // Save updated user to MongoDB or in-memory storage
    if (mongoService.isConnected()) {
        if (!mongoService.updateUser(userId, user)) {
            std::map<std::string, std::string> response;
            response["success"] = "false";
            response["message"] = "Failed to update user in database";
            return SimpleJSON::stringify(response);
        }
    } else {
        // In-memory storage fallback
        std::string oldUsername = user.username;
        // If username changed, remove old entry and add new one
        if (oldUsername != user.username && users.find(oldUsername) != users.end()) {
            users.erase(oldUsername);
        }
        users[user.username] = user;
    }

    // Generate new token with updated username
    std::string token = "token_" + user.username + "_" + std::to_string(time(nullptr));
    
    // Save token to MongoDB or in-memory
    if (mongoService.isConnected()) {
        mongoService.saveToken(token, user.id);
    } else {
        tokens[token] = user.id;
    }

    // Build response
    std::ostringstream oss;
    oss << "{\"success\":true,\"message\":\"Profile updated successfully\",\"token\":\""
        << token << "\",\"user\":{"
        << "\"id\":\"" << user.id << "\","
        << "\"username\":\"" << user.username << "\","
        << "\"email\":\"" << user.email << "\"";
    if (!user.fullName.empty() || !user.bio.empty()) {
        oss << ",\"profile\":{";
        if (!user.fullName.empty()) {
            oss << "\"fullName\":\"" << SimpleJSON::escape(user.fullName) << "\"";
        }
        if (!user.bio.empty()) {
            if (!user.fullName.empty()) oss << ",";
            oss << "\"bio\":\"" << SimpleJSON::escape(user.bio) << "\"";
        }
        oss << "}";
    }
    oss << "}}";
    return oss.str();
}
