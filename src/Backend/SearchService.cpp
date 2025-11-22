/**
 * SearchService - Implementation
 * C++ equivalent of routes/search.js
 */

#include "SearchService.h"
#include <algorithm>
#include <cctype>

// Static catalog definition (matches routes/search.js)
const CatalogItem SearchService::CATALOG[] = {
    CatalogItem("ITEM001", "Laptop Pro 15\"", 999.99, "Powerful performance for everyday work and gaming."),
    CatalogItem("ITEM002", "Wireless Mouse", 29.99, "Ergonomic travel-friendly wireless mouse."),
    CatalogItem("ITEM003", "Mechanical Keyboard", 79.99, "Hot-swappable switches with per-key RGB lighting."),
    CatalogItem("ITEM004", "4K Monitor", 299.99, "Ultra sharp IPS panel with 95% DCI-P3 coverage."),
    CatalogItem("ITEM005", "USB-C Hub", 49.99, "Seven essential ports with 100W passthrough charging.")
};

const size_t SearchService::CATALOG_SIZE = sizeof(CATALOG) / sizeof(CATALOG[0]);

SearchService::SearchService() = default;
SearchService::~SearchService() = default;

std::vector<CatalogItem> SearchService::searchCatalog(const std::string& query) const {
    std::vector<CatalogItem> results;
    
    // Normalize query (trim and lowercase)
    std::string normalizedQuery = query;
    normalizedQuery.erase(0, normalizedQuery.find_first_not_of(" \t\n\r"));
    normalizedQuery.erase(normalizedQuery.find_last_not_of(" \t\n\r") + 1);
    
    if (normalizedQuery.empty()) {
        return results; // Return empty if query is empty
    }

    // Convert to lowercase for case-insensitive search
    std::transform(normalizedQuery.begin(), normalizedQuery.end(), 
                   normalizedQuery.begin(), ::tolower);

    // Search through catalog
    for (size_t i = 0; i < CATALOG_SIZE; ++i) {
        const CatalogItem& item = CATALOG[i];
        
        // Convert item fields to lowercase for comparison
        std::string lowerName = item.name;
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        
        std::string lowerDesc = item.description;
        std::transform(lowerDesc.begin(), lowerDesc.end(), lowerDesc.begin(), ::tolower);
        
        std::string lowerId = item.id;
        std::transform(lowerId.begin(), lowerId.end(), lowerId.begin(), ::tolower);

        // Check if query matches id, name, or description
        if (lowerId.find(normalizedQuery) != std::string::npos ||
            lowerName.find(normalizedQuery) != std::string::npos ||
            lowerDesc.find(normalizedQuery) != std::string::npos) {
            results.push_back(item);
        }
    }

    return results;
}

std::vector<CatalogItem> SearchService::getAllCatalogItems() const {
    std::vector<CatalogItem> items;
    items.reserve(CATALOG_SIZE);
    
    for (size_t i = 0; i < CATALOG_SIZE; ++i) {
        items.push_back(CATALOG[i]);
    }
    
    return items;
}

const CatalogItem* SearchService::getItemById(const std::string& itemId) const {
    for (size_t i = 0; i < CATALOG_SIZE; ++i) {
        if (CATALOG[i].id == itemId) {
            return &CATALOG[i];
        }
    }
    return nullptr;
}

