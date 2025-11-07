/**
 * Login Flow Test Cases
 * Using Catch2 Framework
 * Based on Test Specification Document
 */

#define CATCH_CONFIG_MAIN
#include "catch.hpp"
#include <string>
#include <regex>
#include <iostream>
#include <cassert>
#include "../src/Backend/LoginService.h"

// Test class for Valid Login Test Case
class ValidLoginTestCase {
private:
  LoginService loginService;
  UserCredentials credentials;
  LoginResult result;
  
public:
  ValidLoginTestCase() 
    : credentials("validuser", "validpass123") {}
  
  void setup() {
    // Setup valid credentials
    credentials = UserCredentials("validuser", "validpass123");
  }
  
  LoginResult execute() {
    return loginService.authenticate(credentials);
  }
  
  void verify(const LoginResult& loginResult) {
    REQUIRE(loginResult.success == true);
    REQUIRE(loginResult.message == "Login successful");
    REQUIRE(loginResult.username == "validuser");
  }
  
  void run() {
    setup();
    LoginResult loginResult = execute();
    verify(loginResult);
  }
};

// Test class for Invalid Login Test Case
class InvalidLoginTestCase {
private:
  LoginService loginService;
  UserCredentials credentials;
  LoginResult result;
  
public:
  InvalidLoginTestCase() 
    : credentials("validuser", "wrongpass") {}
  
  void setup() {
    // Setup invalid credentials (valid username, wrong password)
    credentials = UserCredentials("validuser", "wrongpass");
  }
  
  LoginResult execute() {
    return loginService.authenticate(credentials);
  }
  
  void verify(const LoginResult& loginResult) {
    REQUIRE(loginResult.success == false);
    REQUIRE(loginResult.message == "Invalid username or password");
  }
  
  void run() {
    setup();
    LoginResult loginResult = execute();
    verify(loginResult);
  }
};

// Using the ValidLoginTestCase class with backend LoginService
TEST_CASE("Login - Valid Username and Valid Password", "[login]") {
  ValidLoginTestCase testCase;
  testCase.run();
}

// Using the InvalidLoginTestCase class with backend LoginService
TEST_CASE("Login - Valid Username and Invalid Password", "[login]") {
  InvalidLoginTestCase testCase;
  testCase.run();
}

TEST_CASE("Login - Invalid Username and Invalid Password", "[login]") {
  LoginService loginService;
  LoginResult result = loginService.authenticate("invaliduser", "invalidpass");
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Invalid username or password");
}

TEST_CASE("Login - Empty Username", "[login]") {
  LoginService loginService;
  LoginResult result = loginService.authenticate("", "validpass123");
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Username cannot be empty");
}

TEST_CASE("Login - Empty Password", "[login]") {
  LoginService loginService;
  LoginResult result = loginService.authenticate("validuser", "");
  
  REQUIRE(result.success == false);
  REQUIRE(result.message == "Password cannot be empty");
}
