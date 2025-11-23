#include "PurchaseHistory.h"

#include <algorithm>

PurchaseHistory::PurchaseHistory() = default;
PurchaseHistory::~PurchaseHistory() = default;

void PurchaseHistory::recordPurchase(const PurchaseRecord& item) {
  purchases.push_back(item);
}

void PurchaseHistory::recordPurchases(const std::vector<PurchaseRecord>& items) {
  purchases.insert(purchases.end(), items.begin(), items.end());
}

const std::vector<PurchaseRecord>& PurchaseHistory::getPurchases() const {
  return purchases;
}

bool PurchaseHistory::hasPurchase(const std::string& itemId) const {
  return std::any_of(
    purchases.begin(),
    purchases.end(),
    [&](const PurchaseRecord& stored) { return stored.id == itemId; }
  );
}

double PurchaseHistory::getTotalSpent() const {
  double total = 0.0;
  for (const auto& record : purchases) {
    total += record.subtotal();
  }
  return total;
}

void PurchaseHistory::clear() {
  purchases.clear();
}
