#define CATCH_CONFIG_MAIN
#include "catch.hpp"

#include "../src/Backend/PurchaseHistory.h"

TEST_CASE("PurchaseHistory records items and detects duplicates", "[purchase_history]") {
  PurchaseHistory history;
  history.recordPurchase(PurchaseRecord("ITEM001", "Laptop", 999.99, 1));
  history.recordPurchase(PurchaseRecord("ITEM002", "Mouse", 25.00, 2));

  REQUIRE(history.getPurchases().size() == 2);
  REQUIRE(history.hasPurchase("ITEM001"));
  REQUIRE_FALSE(history.hasPurchase("ITEM003"));
}

TEST_CASE("PurchaseHistory computes total spent", "[purchase_history]") {
  PurchaseHistory history;
  history.recordPurchases({
    PurchaseRecord("ITEM001", "Laptop", 999.99, 1),
    PurchaseRecord("ITEM002", "Mouse", 25.00, 3)
  });

  REQUIRE(history.getTotalSpent() == Approx(1074.99));

  history.clear();
  REQUIRE(history.getPurchases().empty());
  REQUIRE(history.getTotalSpent() == Approx(0.0));
}


