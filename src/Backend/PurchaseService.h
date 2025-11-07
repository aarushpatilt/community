/**
 * PurchaseService - Backend class for handling item purchases
 */

#ifndef PURCHASE_SERVICE_H
#define PURCHASE_SERVICE_H

#include <string>
#include <vector>

// Structure to represent an item in inventory
struct Item {
  std::string id;
  std::string name;
  double price;
  bool available;
  
  Item() : id(""), name(""), price(0.0), available(false) {}
  Item(const std::string& itemId, const std::string& itemName, double itemPrice, bool isAvailable)
    : id(itemId), name(itemName), price(itemPrice), available(isAvailable) {}
};

// Structure to hold purchase result
struct PurchaseResult {
  bool success;
  std::string message;
  double remainingBalance;
  
  PurchaseResult() : success(false), message(""), remainingBalance(0.0) {}
  PurchaseResult(bool s, const std::string& msg, double balance = 0.0)
    : success(s), message(msg), remainingBalance(balance) {}
};

// Main PurchaseService class
class PurchaseService {
private:
  // In-memory inventory (for testing purposes)
  // In production, this would connect to a real database
  std::vector<Item> inventory;
  
  // Helper method to find item in inventory
  Item* findItem(const std::string& itemId);
  const Item* findItem(const std::string& itemId) const;
  
  // Helper method to check if user has sufficient funds
  bool hasSufficientFunds(double userBalance, double itemPrice) const;
  
  // Helper method to process payment
  double processPayment(double userBalance, double itemPrice) const;

public:
  PurchaseService();
  ~PurchaseService();
  
  // Initialize inventory with default items
  void initializeInventory();
  
  // Main purchase method
  PurchaseResult purchaseItem(const std::string& itemId, double& userBalance);
  
  // Get item information
  const Item* getItem(const std::string& itemId) const;
  
  // Get all available items
  std::vector<Item> getAvailableItems() const;
  
  // Add item to inventory (for testing/admin purposes)
  void addItem(const Item& item);
};

#endif // PURCHASE_SERVICE_H

