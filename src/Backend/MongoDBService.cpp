/**
 * MongoDBService - Implementation
 * 
 * NOTE: This is a placeholder implementation.
 * To use MongoDB, you need to:
 * 1. Install MongoDB C++ driver (mongocxx)
 * 2. Uncomment and implement the MongoDB code below
 * 3. Update build scripts to link against mongocxx
 * 
 * For now, this class provides a fallback to in-memory storage.
 */

#include "MongoDBService.h"
#include "Cart.h"
#include "PurchaseHistory.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <cctype>

// MongoDB driver includes
// HAS_MONGODB should be defined via compiler flag (-DHAS_MONGODB) if MongoDB is available
#ifdef HAS_MONGODB
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <mongocxx/database.hpp>
#include <mongocxx/collection.hpp>
#include <mongocxx/options/find.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/builder/basic/document.hpp>
#include <bsoncxx/builder/basic/array.hpp>
#include <bsoncxx/json.hpp>
#include <bsoncxx/types.hpp>
using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::open_document;
using bsoncxx::builder::stream::close_document;
using bsoncxx::builder::stream::finalize;
using bsoncxx::builder::basic::make_document;
using bsoncxx::builder::basic::make_array;
using bsoncxx::builder::basic::kvp;
#endif

// Forward declaration of User struct (defined in Server.cpp)
struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string password;
    Cart cart;
    PurchaseHistory history;
    std::string fullName;
    std::string bio;
};

#ifdef HAS_MONGODB
static mongocxx::instance instance{};
static mongocxx::client* client = nullptr;
static mongocxx::database* db = nullptr;
#endif

MongoDBService::MongoDBService() : connected(false), connectionString(""), databaseName("") {
}

MongoDBService::~MongoDBService() {
#ifdef HAS_MONGODB
    if (db) delete db;
    if (client) delete client;
#endif
}

bool MongoDBService::connect(const std::string& connStr, const std::string& dbName) {
    connectionString = connStr;
    databaseName = dbName;
    
#ifdef HAS_MONGODB
    try {
        mongocxx::uri uri(connStr);
        client = new mongocxx::client(uri);
        db = new mongocxx::database((*client)[dbName]);
        
        // Test connection
        auto admin = (*client)["admin"];
        auto ping_cmd = make_document(kvp("ping", 1));
        auto result = admin.run_command(ping_cmd.view());
        
        connected = true;
        std::cout << "✅ MongoDB: Connected successfully to " << dbName << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cout << "❌ MongoDB: Connection failed - " << e.what() << std::endl;
        connected = false;
        return false;
    }
#else
    std::cout << "MongoDB: Driver not available. Using in-memory storage." << std::endl;
    connected = false;
    return false;
#endif
}

bool MongoDBService::isConnected() const {
    return connected;
}

#ifdef HAS_MONGODB
// Helper function to safely get string from BSON element
static std::string safeGetString(const bsoncxx::document::view& doc, const char* key, const std::string& defaultValue = "") {
    // Don't use exceptions for control flow - check everything explicitly
    auto it = doc.find(key);
    if (it == doc.end()) {
        return defaultValue;
    }
    
    // Check if iterator is valid
    try {
        auto elem = *it;
        
        // Try to get type - if this throws, element is uninitialized
        bsoncxx::type type;
        try {
            type = elem.type();
        } catch (...) {
            // Element is uninitialized
            return defaultValue;
        }
        
        // Only proceed if it's a string type
        if (type != bsoncxx::type::k_string) {
            return defaultValue;
        }
        
        // Try to get string value
        try {
            auto str_view = elem.get_string();
            if (str_view.value.data() == nullptr) {
                return defaultValue;
            }
            return std::string(str_view.value.data(), str_view.value.length());
        } catch (...) {
            return defaultValue;
        }
    } catch (...) {
        return defaultValue;
    }
}

// Helper function to safely get string from BSON array element (document)
static std::string safeGetStringFromElement(const bsoncxx::array::element& elem, const char* key, const std::string& defaultValue = "") {
    try {
        // Array element should be a document
        if (elem.type() != bsoncxx::type::k_document) {
            return defaultValue;
        }
        
        auto doc = elem.get_document().view();
        return safeGetString(doc, key, defaultValue);
    } catch (...) {
        return defaultValue;
    }
}

// Helper function to safely get a value from array element
static double safeGetDoubleFromElement(const bsoncxx::array::element& elem, const char* key, double defaultValue = 0.0) {
    try {
        if (elem.type() != bsoncxx::type::k_document) {
            return defaultValue;
        }
        
        auto doc = elem.get_document().view();
        auto it = doc.find(key);
        if (it == doc.end()) {
            return defaultValue;
        }
        
        auto fieldElem = *it;
        try {
            if (fieldElem.type() == bsoncxx::type::k_double) {
                return fieldElem.get_double().value;
            } else if (fieldElem.type() == bsoncxx::type::k_int32) {
                return static_cast<double>(fieldElem.get_int32().value);
            }
        } catch (...) {}
        return defaultValue;
    } catch (...) {
        return defaultValue;
    }
}

static unsigned int safeGetIntFromElement(const bsoncxx::array::element& elem, const char* key, unsigned int defaultValue = 0) {
    try {
        if (elem.type() != bsoncxx::type::k_document) {
            return defaultValue;
        }
        
        auto doc = elem.get_document().view();
        auto it = doc.find(key);
        if (it == doc.end()) {
            return defaultValue;
        }
        
        auto fieldElem = *it;
        try {
            if (fieldElem.type() == bsoncxx::type::k_int32) {
                return static_cast<unsigned int>(fieldElem.get_int32().value);
            } else if (fieldElem.type() == bsoncxx::type::k_int64) {
                return static_cast<unsigned int>(fieldElem.get_int64().value);
            }
        } catch (...) {}
        return defaultValue;
    } catch (...) {
        return defaultValue;
    }
}

// Helper function to safely get _id as string (handles both string and ObjectId)
static std::string safeGetId(const bsoncxx::document::view& doc) {
    auto it = doc.find("_id");
    if (it == doc.end()) {
        return "";
    }
    
    try {
        auto elem = *it;
        
        // Try to get type - if this throws, element is uninitialized
        bsoncxx::type type;
        try {
            type = elem.type();
        } catch (...) {
            return "";
        }
        
        if (type == bsoncxx::type::k_string) {
            try {
                auto str_view = elem.get_string();
                if (str_view.value.data() == nullptr) {
                    return "";
                }
                return std::string(str_view.value.data(), str_view.value.length());
            } catch (...) {
                return "";
            }
        } else if (type == bsoncxx::type::k_oid) {
            try {
                return elem.get_oid().value.to_string();
            } catch (...) {
                return "";
            }
        } else {
            // _id exists but is neither string nor ObjectId
            return "";
        }
    } catch (...) {
        return "";
    }
}
#endif

bool MongoDBService::createUser(const std::string& username, const std::string& email,
                                const std::string& password, const std::string& userId) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        
        // Check if username already exists
        auto usernameFilter = make_document(kvp("username", username));
        auto existingByUsername = users_collection.find_one(usernameFilter.view());
        if (existingByUsername) {
            return false; // Username already exists
        }
        
        // Normalize email: trim whitespace and convert to lowercase
        std::string normalizedEmail = email;
        // Trim leading/trailing whitespace
        normalizedEmail.erase(0, normalizedEmail.find_first_not_of(" \t\n\r"));
        normalizedEmail.erase(normalizedEmail.find_last_not_of(" \t\n\r") + 1);
        // Convert to lowercase
        std::transform(normalizedEmail.begin(), normalizedEmail.end(), normalizedEmail.begin(), ::tolower);
        
        std::cerr << "MongoDB createUser: Checking for email '" << normalizedEmail << "' (input: '" << email << "')" << std::endl;
        
        // Check if email already exists - use same simple logic as username
        auto emailFilter = make_document(kvp("email", normalizedEmail));
        auto existingByEmail = users_collection.find_one(emailFilter.view());
        if (existingByEmail) {
            std::cerr << "MongoDB createUser: Email '" << normalizedEmail << "' already exists in database (direct query)" << std::endl;
            return false; // Email already exists
        }
        
        // Debug: Also check if there are any emails that match when lowercased (in case some weren't normalized)
        // This is a safety check - iterate through all users and check emails
        std::cerr << "MongoDB createUser: Direct query found nothing, checking all users via iteration..." << std::endl;
        auto allUsersCursor = users_collection.find({});
        int userCount = 0;
        for (auto it = allUsersCursor.begin(); it != allUsersCursor.end(); ++it) {
            userCount++;
            auto doc = *it;
            std::string existingEmail = safeGetString(doc, "email");
            if (!existingEmail.empty()) {
                // Trim and normalize existing email for comparison
                std::string existingTrimmed = existingEmail;
                existingTrimmed.erase(0, existingTrimmed.find_first_not_of(" \t\n\r"));
                existingTrimmed.erase(existingTrimmed.find_last_not_of(" \t\n\r") + 1);
                std::string existingLower = existingTrimmed;
                std::transform(existingLower.begin(), existingLower.end(), existingLower.begin(), ::tolower);
                
                if (existingLower == normalizedEmail) {
                    std::cerr << "MongoDB createUser: Found duplicate email via iteration: stored='" << existingEmail 
                              << "' trimmed='" << existingTrimmed << "' normalized='" << existingLower 
                              << "' checking='" << normalizedEmail << "'" << std::endl;
                    return false;
                }
            }
        }
        std::cerr << "MongoDB createUser: Checked " << userCount << " users, no duplicate email found. Proceeding with creation." << std::endl;
        
        // Final check right before insertion - double-check email doesn't exist
        // This prevents race conditions where email was added between our check and now
        auto finalEmailCheck = users_collection.find_one(make_document(kvp("email", normalizedEmail)).view());
        if (finalEmailCheck) {
            std::cerr << "MongoDB createUser: Final check - Email '" << normalizedEmail << "' exists! Aborting creation." << std::endl;
            return false;
        }
        
        // Also check username one more time
        auto finalUsernameCheck = users_collection.find_one(make_document(kvp("username", username)).view());
        if (finalUsernameCheck) {
            std::cerr << "MongoDB createUser: Final check - Username '" << username << "' exists! Aborting creation." << std::endl;
            return false;
        }
        
        std::cerr << "MongoDB createUser: All checks passed. Creating user with email '" << normalizedEmail << "'" << std::endl;
        
        // Create user document using basic builder
        auto empty_array = bsoncxx::builder::basic::array{};
        auto user_doc = make_document(
            kvp("_id", userId),
            kvp("username", username),
            kvp("email", normalizedEmail), // Store normalized (lowercase) email
            kvp("password", password),
            kvp("fullName", ""),
            kvp("bio", ""),
            kvp("cart", empty_array.extract()),
            kvp("purchaseHistory", empty_array.extract())
        );
        
        try {
            users_collection.insert_one(user_doc.view());
            std::cerr << "MongoDB createUser: Successfully created user with email '" << normalizedEmail << "'" << std::endl;
            return true;
        } catch (const std::exception& e) {
            // MongoDB might throw if there's a duplicate key (if unique index exists)
            std::cerr << "MongoDB createUser: Insert failed: " << e.what() << std::endl;
            return false;
        }
    } catch (const std::exception& e) {
        std::cerr << "MongoDB createUser error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::findUserByUsername(const std::string& username, User& user) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        auto filter = make_document(kvp("username", username));
        auto result = users_collection.find_one(filter.view());
        
        if (!result) return false;
        
        auto doc = result->view();
        user.id = safeGetId(doc);
        user.username = safeGetString(doc, "username");
        user.email = safeGetString(doc, "email");
        user.password = safeGetString(doc, "password");
        user.fullName = safeGetString(doc, "fullName");
        user.bio = safeGetString(doc, "bio");
        
        // Load cart - use safe access to avoid uninitialized element errors
        try {
            auto cartIt = doc.find("cart");
            if (cartIt != doc.end()) {
                auto cartElem = *cartIt;
                try {
                    if (cartElem.type() == bsoncxx::type::k_array) {
                        user.cart.clear();
                        for (auto&& item : cartElem.get_array().value) {
                            CartItem cartItem;
                            cartItem.productId = safeGetStringFromElement(item, "productId");
                            cartItem.name = safeGetStringFromElement(item, "name");
                            cartItem.price = safeGetDoubleFromElement(item, "price");
                            cartItem.quantity = safeGetIntFromElement(item, "quantity");
                            if (!cartItem.productId.empty()) {
                                user.cart.addItem(cartItem);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        // Load purchase history - use safe access to avoid uninitialized element errors
        try {
            auto historyIt = doc.find("purchaseHistory");
            if (historyIt != doc.end()) {
                auto historyElem = *historyIt;
                try {
                    if (historyElem.type() == bsoncxx::type::k_array) {
                        user.history.clear();
                        for (auto&& purchase : historyElem.get_array().value) {
                            PurchaseRecord record;
                            record.id = safeGetStringFromElement(purchase, "id");
                            record.name = safeGetStringFromElement(purchase, "name");
                            record.price = safeGetDoubleFromElement(purchase, "price");
                            record.quantity = safeGetIntFromElement(purchase, "quantity");
                            if (!record.id.empty()) {
                                user.history.recordPurchase(record);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB findUserByUsername error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::findUserByEmail(const std::string& email, User& user) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        // Normalize email: trim whitespace and convert to lowercase - use same simple approach as findUserByUsername
        std::string lowerEmail = email;
        // Trim whitespace
        lowerEmail.erase(0, lowerEmail.find_first_not_of(" \t\n\r"));
        lowerEmail.erase(lowerEmail.find_last_not_of(" \t\n\r") + 1);
        // Convert to lowercase
        std::transform(lowerEmail.begin(), lowerEmail.end(), lowerEmail.begin(), ::tolower);
        
        std::cerr << "MongoDB findUserByEmail: Searching for email '" << lowerEmail << "' (input: '" << email << "')" << std::endl;
        
        // Simple direct query - same as username checking
        auto filter = make_document(kvp("email", lowerEmail));
        auto result = users_collection.find_one(filter.view());
        
        if (!result) {
            // Debug: If not found, check all users to see if there's a case mismatch
            // This handles cases where emails weren't normalized when stored
            auto allUsersCursor = users_collection.find({});
            for (auto it = allUsersCursor.begin(); it != allUsersCursor.end(); ++it) {
                auto tempDoc = *it;
                std::string existingEmail = safeGetString(tempDoc, "email");
                if (!existingEmail.empty()) {
                    std::string existingLower = existingEmail;
                    std::transform(existingLower.begin(), existingLower.end(), existingLower.begin(), ::tolower);
                    if (existingLower == lowerEmail) {
                        // Found a match! Query again by _id to get proper result object
                        std::string foundId = safeGetId(tempDoc);
                        if (!foundId.empty()) {
                            result = users_collection.find_one(make_document(kvp("_id", foundId)).view());
                            std::cerr << "MongoDB findUserByEmail: Found email via iteration: stored='" << existingEmail 
                                      << "' query='" << lowerEmail << "'" << std::endl;
                            break;
                        }
                    }
                }
            }
        }
        
        if (!result) {
            std::cerr << "MongoDB findUserByEmail: Email '" << lowerEmail << "' not found in database" << std::endl;
            return false;
        }
        
        auto doc = result->view();
        
        // Load user data
        user.id = safeGetId(doc);
        user.username = safeGetString(doc, "username");
        user.email = safeGetString(doc, "email");
        user.password = safeGetString(doc, "password");
        user.fullName = safeGetString(doc, "fullName");
        user.bio = safeGetString(doc, "bio");
        
        // Load cart using safe access
        try {
            auto cartIt = doc.find("cart");
            if (cartIt != doc.end()) {
                auto cartElem = *cartIt;
                try {
                    if (cartElem.type() == bsoncxx::type::k_array) {
                        user.cart.clear();
                        for (auto&& item : cartElem.get_array().value) {
                            CartItem cartItem;
                            cartItem.productId = safeGetStringFromElement(item, "productId");
                            cartItem.name = safeGetStringFromElement(item, "name");
                            cartItem.price = safeGetDoubleFromElement(item, "price");
                            cartItem.quantity = safeGetIntFromElement(item, "quantity");
                            if (!cartItem.productId.empty()) {
                                user.cart.addItem(cartItem);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        // Load purchase history using safe access
        try {
            auto historyIt = doc.find("purchaseHistory");
            if (historyIt != doc.end()) {
                auto historyElem = *historyIt;
                try {
                    if (historyElem.type() == bsoncxx::type::k_array) {
                        user.history.clear();
                        for (auto&& purchase : historyElem.get_array().value) {
                            PurchaseRecord record;
                            record.id = safeGetStringFromElement(purchase, "id");
                            record.name = safeGetStringFromElement(purchase, "name");
                            record.price = safeGetDoubleFromElement(purchase, "price");
                            record.quantity = safeGetIntFromElement(purchase, "quantity");
                            if (!record.id.empty()) {
                                user.history.recordPurchase(record);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB findUserByEmail error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::emailExists(const std::string& email) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        // Normalize email: trim whitespace and convert to lowercase
        std::string lowerEmail = email;
        lowerEmail.erase(0, lowerEmail.find_first_not_of(" \t\n\r"));
        lowerEmail.erase(lowerEmail.find_last_not_of(" \t\n\r") + 1);
        std::transform(lowerEmail.begin(), lowerEmail.end(), lowerEmail.begin(), ::tolower);
        
        // Simple direct query - same as username checking
        auto filter = make_document(kvp("email", lowerEmail));
        auto result = users_collection.find_one(filter.view());
        
        if (result) {
            std::cerr << "MongoDB emailExists: Email '" << lowerEmail << "' EXISTS in database" << std::endl;
            return true;
        }
        
        // Fallback: check all users via iteration (in case email wasn't normalized when stored)
        auto allUsersCursor = users_collection.find({});
        for (auto it = allUsersCursor.begin(); it != allUsersCursor.end(); ++it) {
            auto doc = *it;
            std::string existingEmail = safeGetString(doc, "email");
            if (!existingEmail.empty()) {
                std::string existingTrimmed = existingEmail;
                existingTrimmed.erase(0, existingTrimmed.find_first_not_of(" \t\n\r"));
                existingTrimmed.erase(existingTrimmed.find_last_not_of(" \t\n\r") + 1);
                std::string existingLower = existingTrimmed;
                std::transform(existingLower.begin(), existingLower.end(), existingLower.begin(), ::tolower);
                if (existingLower == lowerEmail) {
                    std::cerr << "MongoDB emailExists: Email '" << lowerEmail << "' EXISTS (found via iteration)" << std::endl;
                    return true;
                }
            }
        }
        
        std::cerr << "MongoDB emailExists: Email '" << lowerEmail << "' does NOT exist" << std::endl;
        return false;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB emailExists error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::findUserById(const std::string& userId, User& user) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        
        // Try querying as string first (how we store it)
        auto filter = make_document(kvp("_id", userId));
        auto result = users_collection.find_one(filter.view());
        
        // If not found, try as ObjectId (in case MongoDB converted it)
        if (!result && userId.length() == 24) {
            try {
                bsoncxx::oid oid(userId);
                auto oidFilter = make_document(kvp("_id", oid));
                result = users_collection.find_one(oidFilter.view());
            } catch (...) {
                // Not a valid ObjectId, continue
            }
        }
        
        if (!result) {
            std::cerr << "MongoDB findUserById: User not found with userId: " << userId << std::endl;
            return false;
        }
        
        auto doc = result->view();
        
        // Check if document is empty
        if (doc.empty()) {
            std::cerr << "MongoDB findUserById: Empty document returned for userId: " << userId << std::endl;
            return false;
        }
        
        user.id = safeGetId(doc);
        if (user.id.empty()) {
            std::cerr << "MongoDB findUserById: Could not extract _id from document for userId: " << userId << std::endl;
            // Try to get _id directly as fallback
            try {
                auto idIt = doc.find("_id");
                if (idIt != doc.end()) {
                    auto idElem = *idIt;
                    try {
                        if (idElem.type() == bsoncxx::type::k_string) {
                            user.id = std::string(idElem.get_string().value);
                        } else if (idElem.type() == bsoncxx::type::k_oid) {
                            user.id = idElem.get_oid().value.to_string();
                        }
                    } catch (...) {
                        // Ignore
                    }
                }
            } catch (...) {
                // Ignore
            }
            if (user.id.empty()) {
                return false;
            }
        }
        
        // Safely get all fields - check each one individually
        user.username = safeGetString(doc, "username");
        if (user.username.empty()) {
            std::cerr << "MongoDB findUserById: username field missing or empty for userId: " << userId << std::endl;
            // Log available fields for debugging
            try {
                std::cerr << "Document fields: ";
                for (auto&& field : doc) {
                    try {
                        std::cerr << field.key() << " ";
                    } catch (...) {
                        std::cerr << "(invalid) ";
                    }
                }
                std::cerr << std::endl;
            } catch (...) {
                // Ignore
            }
            return false;
        }
        
        user.email = safeGetString(doc, "email");
        if (user.email.empty()) {
            std::cerr << "MongoDB findUserById: email field missing or empty for userId: " << userId << std::endl;
            return false;
        }
        
        user.password = safeGetString(doc, "password");
        user.fullName = safeGetString(doc, "fullName");
        user.bio = safeGetString(doc, "bio");
        
        // Validate required fields
        if (user.username.empty() || user.email.empty()) {
            std::cerr << "MongoDB findUserById: Missing required fields (username='" << user.username 
                      << "' email='" << user.email << "') for userId: " << userId << std::endl;
            return false;
        }
        
        // Load cart - use safe access to avoid uninitialized element errors
        try {
            auto cartIt = doc.find("cart");
            if (cartIt != doc.end()) {
                auto cartElem = *cartIt;
                try {
                    if (cartElem.type() == bsoncxx::type::k_array) {
                        user.cart.clear();
                        for (auto&& item : cartElem.get_array().value) {
                            CartItem cartItem;
                            cartItem.productId = safeGetStringFromElement(item, "productId");
                            cartItem.name = safeGetStringFromElement(item, "name");
                            cartItem.price = safeGetDoubleFromElement(item, "price");
                            cartItem.quantity = safeGetIntFromElement(item, "quantity");
                            if (!cartItem.productId.empty()) {
                                user.cart.addItem(cartItem);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        // Load purchase history - use safe access to avoid uninitialized element errors
        try {
            auto historyIt = doc.find("purchaseHistory");
            if (historyIt != doc.end()) {
                auto historyElem = *historyIt;
                try {
                    if (historyElem.type() == bsoncxx::type::k_array) {
                        user.history.clear();
                        for (auto&& purchase : historyElem.get_array().value) {
                            PurchaseRecord record;
                            record.id = safeGetStringFromElement(purchase, "id");
                            record.name = safeGetStringFromElement(purchase, "name");
                            record.price = safeGetDoubleFromElement(purchase, "price");
                            record.quantity = safeGetIntFromElement(purchase, "quantity");
                            if (!record.id.empty()) {
                                user.history.recordPurchase(record);
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB findUserById error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::updateUser(const std::string& userId, const User& user) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto users_collection = (*db)["users"];
        
        // Build cart array using basic builder
        auto cart_array_builder = bsoncxx::builder::basic::array{};
        for (const auto& item : user.cart.getItems()) {
            cart_array_builder.append(make_document(
                kvp("productId", item.productId),
                kvp("name", item.name),
                kvp("price", item.price),
                kvp("quantity", static_cast<int32_t>(item.quantity))
            ));
        }
        
        // Build purchase history array
        auto history_array_builder = bsoncxx::builder::basic::array{};
        for (const auto& purchase : user.history.getPurchases()) {
            history_array_builder.append(make_document(
                kvp("id", purchase.id),
                kvp("name", purchase.name),
                kvp("price", purchase.price),
                kvp("quantity", static_cast<int32_t>(purchase.quantity))
            ));
        }
        
        // Normalize email to lowercase before updating
        std::string normalizedEmail = user.email;
        std::transform(normalizedEmail.begin(), normalizedEmail.end(), normalizedEmail.begin(), ::tolower);
        
        // Update document using basic builder
        auto update_doc = make_document(
            kvp("$set", make_document(
                kvp("username", user.username),
                kvp("email", normalizedEmail), // Store normalized (lowercase) email
                kvp("password", user.password),
                kvp("fullName", user.fullName),
                kvp("bio", user.bio),
                kvp("cart", cart_array_builder.extract()),
                kvp("purchaseHistory", history_array_builder.extract())
            ))
        );
        
        auto filter = make_document(kvp("_id", userId));
        auto result = users_collection.update_one(filter.view(), update_doc.view());
        
        return result && result->modified_count() > 0;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB updateUser error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::getCart(const std::string& userId, std::vector<CartItem>& cart) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        User user;
        if (!findUserById(userId, user)) return false;
        
        cart = user.cart.getItems();
        return true;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB getCart error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::updateCart(const std::string& userId, const std::vector<CartItem>& cart) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        User user;
        if (!findUserById(userId, user)) return false;
        
        // Update cart
        user.cart.clear();
        for (const auto& item : cart) {
            user.cart.addItem(item);
        }
        
        // Save back to MongoDB
        return updateUser(userId, user);
    } catch (const std::exception& e) {
        std::cerr << "MongoDB updateCart error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::clearCart(const std::string& userId) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        User user;
        if (!findUserById(userId, user)) return false;
        
        user.cart.clear();
        return updateUser(userId, user);
    } catch (const std::exception& e) {
        std::cerr << "MongoDB clearCart error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::addPurchase(const std::string& userId, const std::vector<PurchaseRecord>& purchases,
                                 const std::string& orderId, double total) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        User user;
        if (!findUserById(userId, user)) return false;
        
        // Add purchases to history
        for (const auto& purchase : purchases) {
            user.history.recordPurchase(purchase);
        }
        
        // Also save as a separate order document
        auto orders_collection = (*db)["orders"];
        auto items_array_builder = bsoncxx::builder::basic::array{};
        for (const auto& purchase : purchases) {
            items_array_builder.append(make_document(
                kvp("productId", purchase.id),  // Use productId for frontend compatibility
                kvp("id", purchase.id),         // Keep id for backward compatibility
                kvp("name", purchase.name),
                kvp("price", purchase.price),
                kvp("quantity", static_cast<int32_t>(purchase.quantity)),
                kvp("subtotal", purchase.price * static_cast<double>(purchase.quantity))
            ));
        }
        
        auto order_doc = make_document(
            kvp("_id", orderId),
            kvp("userId", userId),
            kvp("items", items_array_builder.extract()),
            kvp("total", total),
            kvp("timestamp", bsoncxx::types::b_date{std::chrono::system_clock::now()})
        );
        
        orders_collection.insert_one(order_doc.view());
        
        // Update user document
        return updateUser(userId, user);
    } catch (const std::exception& e) {
        std::cerr << "MongoDB addPurchase error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::getPurchaseHistory(const std::string& userId, std::vector<std::string>& historyJson) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    historyJson.clear();
    
    try {
        auto orders_collection = (*db)["orders"];
        
        // Get all matching documents with simple query
        auto filter = make_document(kvp("userId", userId));
        
        // Use find() to get cursor - limit to prevent memory issues
        try {
            mongocxx::options::find opts;
            opts.limit(100); // Limit to 100 orders to prevent memory issues
            
            auto cursor = orders_collection.find(filter.view(), opts);
            
            // Iterate cursor safely - convert to JSON immediately and store string
            for (auto it = cursor.begin(); it != cursor.end(); ++it) {
                try {
                    auto doc = *it;
                    // Convert to JSON immediately while document is valid
                    std::string jsonStr = bsoncxx::to_json(doc);
                    historyJson.push_back(jsonStr);
                } catch (const std::exception& e) {
                    std::cerr << "MongoDB getPurchaseHistory: Error converting document to JSON: " << e.what() << std::endl;
                    // Continue with next document
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "MongoDB getPurchaseHistory: Cursor error: " << e.what() << std::endl;
            // Return empty history if cursor fails (collection might not exist yet)
            return true; // Return true with empty history
        }
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB getPurchaseHistory error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

bool MongoDBService::saveToken(const std::string& token, const std::string& userId) {
    if (!connected) return false;
#ifdef HAS_MONGODB
    if (!db) return false;
#endif
    
#ifdef HAS_MONGODB
    try {
        auto tokens_collection = (*db)["tokens"];
        
        // Remove old token if exists
        auto delete_filter = make_document(kvp("token", token));
        tokens_collection.delete_one(delete_filter.view());
        
        // Insert new token
        auto token_doc = make_document(
            kvp("token", token),
            kvp("userId", userId),
            kvp("createdAt", bsoncxx::types::b_date{std::chrono::system_clock::now()})
        );
        
        auto insert_result = tokens_collection.insert_one(token_doc.view());
        if (insert_result) {
            std::cerr << "MongoDB saveToken: Successfully saved token for userId '" << userId << "'" << std::endl;
            return true;
        } else {
            std::cerr << "MongoDB saveToken: Insert returned no result" << std::endl;
            return false;
        }
    } catch (const std::exception& e) {
        std::cerr << "MongoDB saveToken error: " << e.what() << std::endl;
        return false;
    }
#else
    return false;
#endif
}

std::string MongoDBService::getUserIdFromToken(const std::string& token) {
    if (!connected) {
        std::cerr << "MongoDB getUserIdFromToken: Not connected to MongoDB" << std::endl;
        return "";
    }
#ifdef HAS_MONGODB
    if (!db) {
        std::cerr << "MongoDB getUserIdFromToken: Database pointer is null" << std::endl;
        return "";
    }
#endif
    
#ifdef HAS_MONGODB
    try {
        auto tokens_collection = (*db)["tokens"];
        auto filter = make_document(kvp("token", token));
        std::cerr << "MongoDB getUserIdFromToken: Looking up token (length: " << token.length() << ")" << std::endl;
        auto result = tokens_collection.find_one(filter.view());
        
        if (!result) {
            // Token not found - this is normal for invalid tokens
            std::cerr << "MongoDB getUserIdFromToken: Token not found in database" << std::endl;
            return "";
        }
        
        // Get document view - but don't hold it longer than necessary
        std::string userId;
        {
            auto doc = result->view();
            if (doc.empty()) {
                std::cerr << "MongoDB getUserIdFromToken: Empty document returned for token" << std::endl;
                return "";
            }
            
            // Use safeGetString which handles uninitialized elements
            userId = safeGetString(doc, "userId");
            if (userId.empty()) {
                // Try alternative field names
                userId = safeGetString(doc, "user_id");
                if (userId.empty()) {
                    userId = safeGetString(doc, "userID");
                }
            }
            
            if (userId.empty()) {
                // Log available fields for debugging (but don't hold doc view)
                try {
                    std::cerr << "MongoDB getUserIdFromToken: userId field missing. Available fields: ";
                    for (auto it = doc.begin(); it != doc.end(); ++it) {
                        try {
                            std::cerr << it->key() << " ";
                        } catch (...) {
                            std::cerr << "(invalid) ";
                        }
                    }
                    std::cerr << std::endl;
                } catch (...) {
                    std::cerr << "MongoDB getUserIdFromToken: Could not enumerate document fields" << std::endl;
                }
            }
        } // doc view goes out of scope here
        
        if (!userId.empty()) {
            std::cerr << "MongoDB getUserIdFromToken: Found userId '" << userId << "' for token" << std::endl;
        } else {
            std::cerr << "MongoDB getUserIdFromToken: Token found but userId is empty" << std::endl;
        }
        
        return userId;
    } catch (const std::exception& e) {
        std::cerr << "MongoDB getUserIdFromToken error: " << e.what() << std::endl;
        return "";
    } catch (...) {
        std::cerr << "MongoDB getUserIdFromToken: Unknown error" << std::endl;
        return "";
    }
#else
    return "";
#endif
}

