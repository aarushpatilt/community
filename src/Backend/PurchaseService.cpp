/**
 * PurchaseService - Implementation
 */

#include "PurchaseService.h"
#include <algorithm>

PurchaseService::PurchaseService() {
  initializeInventory();
}

PurchaseService::~PurchaseService() {
  // Destructor - cleanup if needed
}

void PurchaseService::initializeInventory() {
  // Initialize with default inventory items
  inventory.clear();
  inventory.push_back(Item("ITEM001", "Laptop", 999.99, true));
  inventory.push_back(Item("ITEM002", "Mouse", 29.99, true));
  inventory.push_back(Item("ITEM003", "Keyboard", 79.99, true));
  inventory.push_back(Item("ITEM004", "Monitor", 299.99, false)); // Out of stock
}

Item* PurchaseService::findItem(const std::string& itemId) {
  for (auto& item : inventory) {
    if (item.id == itemId) {
      return &item;
    }
  }
  return nullptr;
}

const Item* PurchaseService::findItem(const std::string& itemId) const {
  for (const auto& item : inventory) {
    if (item.id == itemId) {
      return &item;
    }
  }
  return nullptr;
}

bool PurchaseService::hasSufficientFunds(double userBalance, double itemPrice) const {
  return userBalance >= itemPrice;
}

double PurchaseService::processPayment(double userBalance, double itemPrice) const {
  return userBalance - itemPrice;
}

PurchaseResult PurchaseService::purchaseItem(const std::string& itemId, double& userBalance) {
  // Step 1: Find item in inventory
  Item* foundItem = findItem(itemId);
  if (foundItem == nullptr) {
    return PurchaseResult(false, "Item not found", userBalance);
  }
  
  // Step 2: Check if item is available
  if (!foundItem->available) {
    return PurchaseResult(false, "Item out of stock", userBalance);
  }
  
  // Step 3: Check if user has sufficient funds
  if (!hasSufficientFunds(userBalance, foundItem->price)) {
    return PurchaseResult(false, "Insufficient funds", userBalance);
  }
  
  // Step 4: Process purchase
  userBalance = processPayment(userBalance, foundItem->price);
  
  // Step 5: Mark item as purchased (optional - could remove from inventory)
  // For now, we'll keep it available for multiple purchases
  
  return PurchaseResult(true, "Purchase successful", userBalance);
}

const Item* PurchaseService::getItem(const std::string& itemId) const {
  return findItem(itemId);
}

std::vector<Item> PurchaseService::getAvailableItems() const {
  std::vector<Item> available;
  for (const auto& item : inventory) {
    if (item.available) {
      available.push_back(item);
    }
  }
  return available;
}

void PurchaseService::addItem(const Item& item) {
  inventory.push_back(item);
}

