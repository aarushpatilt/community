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
#include "../src/Backend/PurchaseService.h"

// Test class for Valid Purchase Test Case
class ValidPurchaseTestCase {
private:
  PurchaseService purchaseService;
  std::string itemId;
  double initialBalance;
  double expectedRemainingBalance;
  
public:
  ValidPurchaseTestCase() 
    : itemId("ITEM001"), initialBalance(1500.00), expectedRemainingBalance(500.01) {}
  
  void setup() {
    // Setup valid purchase scenario
    itemId = "ITEM001"; // Laptop
    initialBalance = 1500.00;
    expectedRemainingBalance = 500.01; // 1500 - 999.99
  }
  
  PurchaseResult execute(double& balance) {
    return purchaseService.purchaseItem(itemId, balance);
  }
  
  void verify(const PurchaseResult& result, double finalBalance) {
    REQUIRE(result.success == true);
    REQUIRE(result.message == "Purchase successful");
    REQUIRE(finalBalance == Approx(expectedRemainingBalance));
    REQUIRE(result.remainingBalance == Approx(expectedRemainingBalance));
  }
  
  void run() {
    setup();
    double balance = initialBalance;
    PurchaseResult result = execute(balance);
    verify(result, balance);
  }
};

// Test class for Insufficient Funds Test Case
class InsufficientFundsTestCase {
private:
  PurchaseService purchaseService;
  std::string itemId;
  double initialBalance;
  
public:
  InsufficientFundsTestCase() 
    : itemId("ITEM001"), initialBalance(500.00) {}
  
  void setup() {
    // Setup insufficient funds scenario
    itemId = "ITEM001"; // Laptop costs 999.99
    initialBalance = 500.00; // Not enough
  }
  
  PurchaseResult execute(double& balance) {
    return purchaseService.purchaseItem(itemId, balance);
  }
  
  void verify(const PurchaseResult& result, double finalBalance) {
    REQUIRE(result.success == false);
    REQUIRE(result.message == "Insufficient funds");
    REQUIRE(finalBalance == Approx(initialBalance)); // Balance unchanged
  }
  
  void run() {
    setup();
    double balance = initialBalance;
    PurchaseResult result = execute(balance);
    verify(result, balance);
  }
};

// Using the ValidPurchaseTestCase class with backend PurchaseService
TEST_CASE("Purchase - Valid Purchase Request", "[purchase]") {
  ValidPurchaseTestCase testCase;
  testCase.run();
}

// Using the InsufficientFundsTestCase class with backend PurchaseService
TEST_CASE("Purchase - Insufficient Funds", "[purchase]") {
  InsufficientFundsTestCase testCase;
  testCase.run();
}

TEST_CASE("Purchase - Non-Existent Item", "[purchase]") {
  PurchaseService purchaseService;
  double balance = 1000.00;
  PurchaseResult result = purchaseService.purchaseItem("ITEM999", balance);
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Item not found");
  REQUIRE(balance == Approx(1000.00)); // Balance unchanged
}

TEST_CASE("Purchase - Out of Stock Item", "[purchase]") {
  PurchaseService purchaseService;
  double balance = 1000.00;
  PurchaseResult result = purchaseService.purchaseItem("ITEM004", balance);
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Item out of stock");
  REQUIRE(balance == Approx(1000.00)); // Balance unchanged
}

TEST_CASE("Purchase - Multiple Items", "[purchase]") {
  PurchaseService purchaseService;
  double balance = 1000.00;
  
  // Purchase mouse
  PurchaseResult result1 = purchaseService.purchaseItem("ITEM002", balance);
  REQUIRE(result1.success == true);
  REQUIRE(balance == Approx(970.01)); // 1000 - 29.99
  
  // Purchase keyboard
  PurchaseResult result2 = purchaseService.purchaseItem("ITEM003", balance);
  REQUIRE(result2.success == true);
  REQUIRE(balance == Approx(890.02)); // 970.01 - 79.99
}
