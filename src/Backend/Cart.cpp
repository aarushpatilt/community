#include "Cart.h"

#include <algorithm>

Cart::Cart() = default;
Cart::~Cart() = default;

CartItem* Cart::findItem(const std::string& productId) {
  auto it = std::find_if(
    items.begin(),
    items.end(),
    [&](const CartItem& entry) { return entry.productId == productId; }
  );

  return it == items.end() ? nullptr : &(*it);
}

const CartItem* Cart::findItem(const std::string& productId) const {
  auto it = std::find_if(
    items.begin(),
    items.end(),
    [&](const CartItem& entry) { return entry.productId == productId; }
  );

  return it == items.end() ? nullptr : &(*it);
}

void Cart::addItem(const CartItem& item) {
  CartItem* existing = findItem(item.productId);
  if (existing) {
    existing->quantity += item.quantity;
  } else if (item.quantity > 0) {
    items.push_back(item);
  }
}

bool Cart::updateQuantity(const std::string& productId, unsigned int quantity) {
  CartItem* existing = findItem(productId);
  if (!existing) {
    return false;
  }

  if (quantity == 0) {
    removeItem(productId);
    return true;
  }

  existing->quantity = quantity;
  return true;
}

bool Cart::removeItem(const std::string& productId) {
  auto originalSize = items.size();
  items.erase(
    std::remove_if(
      items.begin(),
      items.end(),
      [&](const CartItem& entry) { return entry.productId == productId; }
    ),
    items.end()
  );
  return items.size() != originalSize;
}

void Cart::clear() {
  items.clear();
}

bool Cart::isEmpty() const {
  return items.empty();
}

double Cart::getTotal() const {
  double total = 0.0;
  for (const auto& item : items) {
    total += item.subtotal();
  }
  return total;
}

const std::vector<CartItem>& Cart::getItems() const {
  return items;
}


