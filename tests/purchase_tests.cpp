/**
 * Purchase Item Test Cases
 * Using Catch2 Framework
 * Based on Test Specification Document
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include <regex>
#include <iostream>
#include <cassert>
#include <vector>

// Mock structures
struct Item {
  std::string id;
  std::string name;
  double price;
  bool available;
};

struct PurchaseResult {
  bool success;
  std::string message;
  double remainingBalance;
};

// Mock inventory
std::vector<Item> inventory = {
  {"ITEM001", "Laptop", 999.99, true},
  {"ITEM002", "Mouse", 29.99, true},
  {"ITEM003", "Keyboard", 79.99, true},
  {"ITEM004", "Monitor", 299.99, false} // Out of stock
};

PurchaseResult purchaseItem(const std::string& itemId, double& userBalance) {
  PurchaseResult result;
  result.success = false;
  
  // Find item in inventory
  Item* foundItem = nullptr;
  for (auto& item : inventory) {
    if (item.id == itemId) {
      foundItem = &item;
      break;
    }
  }
  
  // Check if item exists
  if (!foundItem) {
    result.message = "Item not found";
    return result;
  }
  
  // Check if item is available
  if (!foundItem->available) {
    result.message = "Item out of stock";
    return result;
  }
  
  // Check if user has sufficient funds
  if (userBalance < foundItem->price) {
    result.message = "Insufficient funds";
    return result;
  }
  
  // Process purchase
  userBalance -= foundItem->price;
  result.success = true;
  result.message = "Purchase successful";
  result.remainingBalance = userBalance;
  
  return result;
}

TEST_CASE("Purchase - Valid Purchase Request", "[purchase]") {
  double balance = 1500.00;
  std::string itemId = "ITEM001"; // Laptop
  
  PurchaseResult result = purchaseItem(itemId, balance);
  
  REQUIRE(result.success == true);
  REQUIRE(result.message == "Purchase successful");
  REQUIRE(balance == Approx(500.01)); // 1500 - 999.99
  REQUIRE(result.remainingBalance == Approx(500.01));
}

TEST_CASE("Purchase - Insufficient Funds", "[purchase]") {
  double balance = 500.00;
  std::string itemId = "ITEM001"; // Laptop costs 999.99
  
  PurchaseResult result = purchaseItem(itemId, balance);
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Insufficient funds");
  REQUIRE(balance == Approx(500.00)); // Balance unchanged
}

TEST_CASE("Purchase - Non-Existent Item", "[purchase]") {
  double balance = 1000.00;
  std::string itemId = "ITEM999"; // Doesn't exist
  
  PurchaseResult result = purchaseItem(itemId, balance);
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Item not found");
  REQUIRE(balance == Approx(1000.00)); // Balance unchanged
}

TEST_CASE("Purchase - Out of Stock Item", "[purchase]") {
  double balance = 1000.00;
  std::string itemId = "ITEM004"; // Monitor (out of stock)
  
  PurchaseResult result = purchaseItem(itemId, balance);
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Item out of stock");
  REQUIRE(balance == Approx(1000.00)); // Balance unchanged
}

TEST_CASE("Purchase - Multiple Items", "[purchase]") {
  double balance = 1000.00;
  
  // Purchase mouse
  PurchaseResult result1 = purchaseItem("ITEM002", balance);
  REQUIRE(result1.success == true);
  REQUIRE(balance == Approx(970.01)); // 1000 - 29.99
  
  // Purchase keyboard
  PurchaseResult result2 = purchaseItem("ITEM003", balance);
  REQUIRE(result2.success == true);
  REQUIRE(balance == Approx(890.02)); // 970.01 - 79.99
}
