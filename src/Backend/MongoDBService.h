/**
 * MongoDBService - Database service for MongoDB operations
 * Handles connection, users, carts, and purchase history
 */

#ifndef MONGODB_SERVICE_H
#define MONGODB_SERVICE_H

#include <string>
#include <vector>

// Forward declarations
struct User;
struct CartItem;
struct PurchaseRecord;

class MongoDBService {
private:
    bool connected;
    std::string connectionString;
    std::string databaseName;

public:
    MongoDBService();
    ~MongoDBService();

    /**
     * Initialize MongoDB connection
     * @param connectionString - MongoDB connection string (e.g., "mongodb://localhost:27017")
     * @param databaseName - Database name (e.g., "community_store")
     * @return true if connection successful
     */
    bool connect(const std::string& connectionString = "mongodb://localhost:27017", 
                 const std::string& databaseName = "community_store");

    /**
     * Check if connected to MongoDB
     */
    bool isConnected() const;

    // User operations
    bool createUser(const std::string& username, const std::string& email, 
                   const std::string& password, const std::string& userId);
    bool findUserByUsername(const std::string& username, User& user);
    bool findUserByEmail(const std::string& email, User& user);
    bool findUserById(const std::string& userId, User& user);
    bool updateUser(const std::string& userId, const User& user);
    // Simple check if email exists (faster than loading full user)
    bool emailExists(const std::string& email);

    // Cart operations
    bool getCart(const std::string& userId, std::vector<CartItem>& cart);
    bool updateCart(const std::string& userId, const std::vector<CartItem>& cart);
    bool clearCart(const std::string& userId);

    // Purchase history operations
    bool addPurchase(const std::string& userId, const std::vector<PurchaseRecord>& purchases,
                    const std::string& orderId, double total);
    bool getPurchaseHistory(const std::string& userId, std::vector<std::string>& historyJson);

    // Token operations
    bool saveToken(const std::string& token, const std::string& userId);
    std::string getUserIdFromToken(const std::string& token);
};

#endif // MONGODB_SERVICE_H

