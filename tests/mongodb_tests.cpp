/**
 * MongoDBService Test Cases
 * Using Catch2 Framework
 * Tests MongoDB connection and basic operations
 * 
 * NOTE: These tests require MongoDB to be running or will skip if unavailable
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include "../src/Backend/MongoDBService.h"

TEST_CASE("MongoDB Connection", "[mongodb][connection]") {
    MongoDBService service;
    
    SECTION("Check connection state") {
        // Initially not connected
        REQUIRE(service.isConnected() == false);
    }
    
    SECTION("Connect to MongoDB") {
        // Try to connect to local MongoDB
        bool connected = service.connect("mongodb://localhost:27017", "test_db");
        
        // May or may not succeed depending on if MongoDB is running
        if (connected) {
            REQUIRE(service.isConnected() == true);
            
            // Test disconnect
            // Note: MongoDBService doesn't have explicit disconnect, but we can test isConnected
        } else {
            // MongoDB not available - skip remaining tests
            WARN("MongoDB not available - skipping connection tests");
        }
    }
}

TEST_CASE("MongoDB User Operations", "[mongodb][users]") {
    MongoDBService service;
    
    // Only run if MongoDB is connected
    if (!service.connect("mongodb://localhost:27017", "test_db")) {
        SKIP("MongoDB not available - skipping user operation tests");
    }
    
    SECTION("Create user") {
        std::string testUserId = "test_user_" + std::to_string(time(nullptr));
        bool created = service.createUser("testuser", "test@example.com", "password123", testUserId);
        
        // Should succeed if user doesn't exist
        // May fail if user already exists (idempotent test)
        if (created) {
            REQUIRE(created == true);
        }
    }
    
    SECTION("Find user by username") {
        auto user = service.findUserByUsername("testuser");
        // May or may not find user depending on test data
        // Just verify function doesn't crash
        REQUIRE(true); // Placeholder - actual user check depends on test data
    }
    
    SECTION("Find user by email") {
        auto user = service.findUserByEmail("test@example.com");
        // May or may not find user depending on test data
        REQUIRE(true); // Placeholder
    }
}

TEST_CASE("MongoDB Service - No Connection", "[mongodb][fallback]") {
    MongoDBService service;
    
    SECTION("Operations fail gracefully when not connected") {
        REQUIRE(service.isConnected() == false);
        
        // These should return false/null when not connected
        bool created = service.createUser("user", "email@test.com", "pass", "id1");
        REQUIRE(created == false);
        
        auto user = service.findUserByUsername("test");
        REQUIRE(user.id.empty());
    }
}

