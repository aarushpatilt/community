/**
 * Logout Flow Test Cases
 * Using Catch2 Framework
 * Based on Test Specification Document
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include <iostream>
#include <cassert>

// Mock session state
bool hasActiveSession = false;
std::string currentUser = "";

void startSession(const std::string& username) {
  hasActiveSession = true;
  currentUser = username;
}

void endSession() {
  hasActiveSession = false;
  currentUser = "";
}

bool logout() {
  if (hasActiveSession) {
    endSession();
    return true;
  }
  return false;
}

TEST_CASE("Logout - Valid Logout Request", "[logout]") {
  // Setup: Start a session first
  startSession("testuser");
  REQUIRE(hasActiveSession == true);
  
  // Execute logout
  bool result = logout();
  
  // Verify logout successful
  REQUIRE(result == true);
  REQUIRE(hasActiveSession == false);
  REQUIRE(currentUser == "");
}

TEST_CASE("Logout - Without Active Session", "[logout]") {
  // Setup: Ensure no active session
  endSession();
  REQUIRE(hasActiveSession == false);
  
  // Execute logout
  bool result = logout();
  
  // Verify logout returns false (no session to logout)
  REQUIRE(result == false);
}

TEST_CASE("Logout - After Session Timeout", "[logout]") {
  // Setup: Simulate timeout by clearing session
  startSession("testuser");
  hasActiveSession = false; // Simulate timeout
  currentUser = "";
  
  // Execute logout
  bool result = logout();
  
  // Verify logout returns false (session already ended)
  REQUIRE(result == false);
  REQUIRE(hasActiveSession == false);
}
