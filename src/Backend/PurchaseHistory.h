/**
 * PurchaseService - Backend class for handling item purchases
 */

 #ifndef PURCHASE_HISTORY_H
 #define PURCHASE_HISTORY_H
 
#include <string>
#include <vector>

// Structure to represent an item stored in history
struct PurchaseRecord {
  std::string id;
  std::string name;
  double price;
  unsigned int quantity;

  PurchaseRecord()
    : id(""), name(""), price(0.0), quantity(0) {}

  PurchaseRecord(const std::string& itemId,
                 const std::string& itemName,
                 double itemPrice,
                 unsigned int qty)
    : id(itemId), name(itemName), price(itemPrice), quantity(qty) {}

  double subtotal() const {
    return price * static_cast<double>(quantity);
  }
};

// PurchaseHistory tracks previously purchased items
class PurchaseHistory {
private:
  std::vector<PurchaseRecord> purchases;

public:
  PurchaseHistory();
  ~PurchaseHistory();

  // Record a completed purchase
  void recordPurchase(const PurchaseRecord& item);

  // Bulk record helper
  void recordPurchases(const std::vector<PurchaseRecord>& items);

  // Get read-only access to all purchases
  const std::vector<PurchaseRecord>& getPurchases() const;

  // Check whether a specific item has been purchased
  bool hasPurchase(const std::string& itemId) const;

  // Calculate total spent
  double getTotalSpent() const;

  // Clear the stored history
  void clear();
};

#endif // PURCHASE_HISTORY_H
 
 