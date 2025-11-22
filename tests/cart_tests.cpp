#define CATCH_CONFIG_MAIN
#include "catch.hpp"

#include "../src/Backend/Cart.h"

TEST_CASE("Cart accumulates totals when items are added", "[cart]") {
  Cart cart;
  cart.addItem(CartItem("ITEM001", "Laptop", 999.99, 1));
  cart.addItem(CartItem("ITEM002", "Mouse", 25.00, 2));

  REQUIRE(cart.getItems().size() == 2);
  REQUIRE(cart.getTotal() == Approx(1049.99));
}

TEST_CASE("Cart merges quantities for identical products", "[cart]") {
  Cart cart;
  cart.addItem(CartItem("ITEM001", "Laptop", 999.99, 1));
  cart.addItem(CartItem("ITEM001", "Laptop", 999.99, 2));

  REQUIRE(cart.getItems().size() == 1);
  REQUIRE(cart.getItems()[0].quantity == 3);
  REQUIRE(cart.getTotal() == Approx(2999.97));
}

TEST_CASE("Cart updates quantity and removes items", "[cart]") {
  Cart cart;
  cart.addItem(CartItem("ITEM002", "Mouse", 25.00, 1));

  REQUIRE(cart.updateQuantity("ITEM002", 4));
  REQUIRE(cart.getItems()[0].quantity == 4);

  REQUIRE(cart.removeItem("ITEM002"));
  REQUIRE(cart.isEmpty());
}


