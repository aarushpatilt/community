/**
 * Search Item Test Cases
 * Using Catch2 Framework
 * Based on Test Specification Document
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include <regex>
#include <vector>
#include <iostream>
#include <cassert>
#include <algorithm>
#include <cctype>

// Mock search function
std::vector<std::string> searchItems(const std::string& query) {
  std::vector<std::string> results;
  
  if (query.empty()) {
    return results; // Empty query returns empty results
  }
  
  // Mock database of items
  std::vector<std::string> items = {
    "laptop", "mouse", "keyboard", "monitor", "desk"
  };
  
  // Simple search: find items containing query (case-insensitive)
  std::string lowerQuery = query;
  std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);
  
  for (const auto& item : items) {
    std::string lowerItem = item;
    std::transform(lowerItem.begin(), lowerItem.end(), lowerItem.begin(), ::tolower);
    
    if (lowerItem.find(lowerQuery) != std::string::npos) {
      results.push_back(item);
    }
  }
  
  return results;
}

TEST_CASE("Search - Valid Search Query", "[search]") {
  std::string query = "lap";
  
  std::vector<std::string> results = searchItems(query);
  
  REQUIRE(results.size() > 0);
  REQUIRE(std::find(results.begin(), results.end(), "laptop") != results.end());
}

TEST_CASE("Search - Empty Search Query", "[search]") {
  std::string query = "";
  
  std::vector<std::string> results = searchItems(query);
  
  REQUIRE(results.size() == 0);
}

TEST_CASE("Search - Query with No Results", "[search]") {
  std::string query = "nonexistentitem123";
  
  std::vector<std::string> results = searchItems(query);
  
  REQUIRE(results.size() == 0);
}

TEST_CASE("Search - Case Insensitive Search", "[search]") {
  std::string query = "MOUSE";
  
  std::vector<std::string> results = searchItems(query);
  
  REQUIRE(results.size() > 0);
  REQUIRE(std::find(results.begin(), results.end(), "mouse") != results.end());
}

TEST_CASE("Search - Partial Match", "[search]") {
  std::string query = "key";
  
  std::vector<std::string> results = searchItems(query);
  
  REQUIRE(results.size() > 0);
  REQUIRE(std::find(results.begin(), results.end(), "keyboard") != results.end());
}
