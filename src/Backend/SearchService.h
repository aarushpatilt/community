/**
 * SearchService - Backend class for catalog search functionality
 * C++ equivalent of routes/search.js
 */

#ifndef SEARCH_SERVICE_H
#define SEARCH_SERVICE_H

#include <string>
#include <vector>

// Catalog item structure
struct CatalogItem {
    std::string id;
    std::string name;
    double price;
    std::string description;

    CatalogItem() : id(""), name(""), price(0.0), description("") {}
    CatalogItem(const std::string& itemId, const std::string& itemName, 
                double itemPrice, const std::string& itemDesc = "")
        : id(itemId), name(itemName), price(itemPrice), description(itemDesc) {}
};

class SearchService {
private:
    // Static catalog (matches routes/search.js)
    static const CatalogItem CATALOG[];
    static const size_t CATALOG_SIZE;

public:
    SearchService();
    ~SearchService();

    /**
     * Search catalog items by query
     * Matches against id, name, or description
     * @param query - Search query string
     * @return Vector of matching catalog items
     */
    std::vector<CatalogItem> searchCatalog(const std::string& query) const;

    /**
     * Get all catalog items
     * @return Vector of all catalog items
     */
    std::vector<CatalogItem> getAllCatalogItems() const;

    /**
     * Get catalog item by ID
     * @param itemId - Item ID to find
     * @return Pointer to catalog item, or nullptr if not found
     */
    const CatalogItem* getItemById(const std::string& itemId) const;
};

#endif // SEARCH_SERVICE_H

