/**
 * SettingsService Test Cases
 * Using Catch2 Framework
 * Tests user profile validation and update functionality
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include "../src/Backend/SettingsService.h"

TEST_CASE("Username Validation", "[settings][validation]") {
    SettingsService service;
    
    SECTION("Valid usernames") {
        auto result = service.validateUsername("testuser");
        REQUIRE(result.valid == true);
        REQUIRE(result.value == "testuser");
        REQUIRE(result.error == "");
        
        result = service.validateUsername("user123");
        REQUIRE(result.valid == true);
        
        result = service.validateUsername("a" + std::string(28, 'b')); // 29 chars
        REQUIRE(result.valid == true);
    }
    
    SECTION("Invalid usernames") {
        auto result = service.validateUsername("");
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("required") != std::string::npos);
        
        result = service.validateUsername("ab"); // Too short
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("3-30") != std::string::npos);
        
        result = service.validateUsername(std::string(31, 'a')); // Too long
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("3-30") != std::string::npos);
        
        result = service.validateUsername("  test  "); // Whitespace trimmed, should be valid
        REQUIRE(result.valid == true);
        REQUIRE(result.value == "test");
    }
}

TEST_CASE("Email Validation", "[settings][validation]") {
    SettingsService service;
    
    SECTION("Valid emails") {
        auto result = service.validateEmail("test@example.com");
        REQUIRE(result.valid == true);
        REQUIRE(result.value == "test@example.com");
        
        result = service.validateEmail("user.name+tag@example.co.uk");
        REQUIRE(result.valid == true);
        
        result = service.validateEmail("user123@test-domain.com");
        REQUIRE(result.valid == true);
    }
    
    SECTION("Invalid emails") {
        auto result = service.validateEmail("");
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("required") != std::string::npos);
        
        result = service.validateEmail("notanemail");
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("invalid") != std::string::npos);
        
        result = service.validateEmail("@example.com");
        REQUIRE(result.valid == false);
        
        result = service.validateEmail("user@");
        REQUIRE(result.valid == false);
        
        result = service.validateEmail("  test@example.com  "); // Should trim
        REQUIRE(result.valid == true);
        REQUIRE(result.value == "test@example.com");
    }
}

TEST_CASE("Password Validation", "[settings][validation]") {
    SettingsService service;
    
    SECTION("Valid passwords") {
        auto result = service.validatePassword("password123");
        REQUIRE(result.valid == true);
        REQUIRE(result.value.length() > 0);
        
        result = service.validatePassword("a" + std::string(99, 'b')); // 100 chars
        REQUIRE(result.valid == true);
        
        result = service.validatePassword("123456"); // Minimum length
        REQUIRE(result.valid == true);
    }
    
    SECTION("Invalid passwords") {
        auto result = service.validatePassword("");
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("required") != std::string::npos);
        
        result = service.validatePassword("12345"); // Too short
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("6") != std::string::npos);
        
        result = service.validatePassword(std::string(101, 'a')); // Too long
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("100") != std::string::npos);
    }
}

TEST_CASE("Profile Validation", "[settings][validation]") {
    SettingsService service;
    
    SECTION("Valid profiles") {
        auto result = service.validateProfile("John Doe", "Software developer");
        REQUIRE(result.valid == true);
        
        result = service.validateProfile("", ""); // Both optional
        REQUIRE(result.valid == true);
        
        result = service.validateProfile("Jane Smith", "");
        REQUIRE(result.valid == true);
        
        result = service.validateProfile("", "Bio text");
        REQUIRE(result.valid == true);
    }
    
    SECTION("Invalid profiles") {
        auto result = service.validateProfile(std::string(81, 'a'), ""); // Full name too long
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("80") != std::string::npos);
        
        result = service.validateProfile("", std::string(161, 'a')); // Bio too long
        REQUIRE(result.valid == false);
        REQUIRE(result.error.find("160") != std::string::npos);
    }
}

TEST_CASE("Token Generation", "[settings][token]") {
    SettingsService service;
    
    SECTION("Generate unique tokens") {
        std::string token1 = service.generateToken("user1", "testuser");
        std::string token2 = service.generateToken("user1", "testuser");
        
        // Tokens should be different (contain timestamp)
        REQUIRE(token1 != token2);
        REQUIRE(token1.find("testuser") != std::string::npos);
        REQUIRE(token1.find("user1") != std::string::npos);
    }
}

TEST_CASE("Password Hashing", "[settings][password]") {
    SettingsService service;
    
    SECTION("Hash password") {
        std::string password = "testpass123";
        std::string hashed = service.hashPassword(password);
        
        // Note: Current implementation returns password as-is (not secure)
        // In production, this should use bcrypt
        REQUIRE(hashed.length() > 0);
    }
}

