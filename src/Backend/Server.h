/**
 * C++ HTTP Server Header
 * Main backend server that replaces app.js
 */

#ifndef SERVER_H
#define SERVER_H

#include <string>

// Forward declarations
struct User;
struct CatalogItem;

class Server {
private:
    int port;
    
    // Helper methods
    std::string getUserIdFromToken(const std::string& token);

public:
    Server(int port = 3000);
    void start();

    // API Endpoint Handlers
    std::string handleSignup(const std::string& body);
    std::string handleLogin(const std::string& body);
    std::string handleGetCart(const std::string& userId);
    std::string handleAddToCart(const std::string& body, const std::string& userId);
    std::string handleUpdateCart(const std::string& productId, unsigned int quantity, const std::string& userId);
    std::string handleRemoveFromCart(const std::string& productId, const std::string& userId);
    std::string handleClearCart(const std::string& userId);
    std::string handleCheckout(const std::string& body, const std::string& userId);
    std::string handleGetPurchaseHistory(const std::string& userId);
    std::string handleGetCatalog();
    std::string handleSearch(const std::string& query);
    std::string handleGetProfile(const std::string& userId);
    std::string handleUpdateProfile(const std::string& body, const std::string& userId);
};

#endif // SERVER_H

