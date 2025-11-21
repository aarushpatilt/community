/**
 * Cart - lightweight in-memory cart implementation used by tests
 */

#ifndef CART_H
#define CART_H

#include <string>
#include <vector>

struct CartItem {
  std::string productId;
  std::string name;
  double price;
  unsigned int quantity;

  CartItem()
    : productId(""), name(""), price(0.0), quantity(0) {}

  CartItem(const std::string& id,
           const std::string& displayName,
           double unitPrice,
           unsigned int qty = 1U)
    : productId(id), name(displayName), price(unitPrice), quantity(qty) {}

  double subtotal() const {
    return price * static_cast<double>(quantity);
  }
};

class Cart {
private:
  std::vector<CartItem> items;

  CartItem* findItem(const std::string& productId);
  const CartItem* findItem(const std::string& productId) const;

public:
  Cart();
  ~Cart();

  void addItem(const CartItem& item);
  bool updateQuantity(const std::string& productId, unsigned int quantity);
  bool removeItem(const std::string& productId);
  void clear();
  bool isEmpty() const;

  double getTotal() const;
  const std::vector<CartItem>& getItems() const;
};

#endif // CART_H