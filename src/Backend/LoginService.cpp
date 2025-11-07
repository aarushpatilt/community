/**
 * LoginService - Implementation
 */

#include "LoginService.h"
#include <algorithm>
#include <cstring>

// Define valid users in the system
const LoginService::User LoginService::validUsers[] = {
  LoginService::User("validuser", "validpass123"),
  LoginService::User("admin", "admin123"),
  LoginService::User("testuser", "testpass")
};

const int LoginService::userCount = sizeof(validUsers) / sizeof(validUsers[0]);

LoginService::LoginService() {
  // Constructor - can initialize database connection here
}

LoginService::~LoginService() {
  // Destructor - cleanup if needed
}

const LoginService::User* LoginService::findUser(const std::string& username) const {
  for (int i = 0; i < userCount; ++i) {
    if (validUsers[i].username == username) {
      return &validUsers[i];
    }
  }
  return nullptr;
}

bool LoginService::validatePassword(const User* user, const std::string& password) const {
  if (user == nullptr) {
    return false;
  }
  return user->password == password;
}

bool LoginService::validateCredentialsFormat(const UserCredentials& credentials) const {
  // Check if credentials are not empty
  if (credentials.username.empty()) {
    return false;
  }
  if (credentials.password.empty()) {
    return false;
  }
  
  // Additional validation can be added here:
  // - Username length constraints
  // - Password strength requirements
  // - Special character validation
  
  return true;
}

LoginResult LoginService::authenticate(const UserCredentials& credentials) {
  // Step 1: Validate credentials format
  if (!validateCredentialsFormat(credentials)) {
    if (credentials.username.empty()) {
      return LoginResult(false, "Username cannot be empty");
    }
    if (credentials.password.empty()) {
      return LoginResult(false, "Password cannot be empty");
    }
    return LoginResult(false, "Invalid credentials format");
  }
  
  // Step 2: Find user in database
  const User* user = findUser(credentials.username);
  if (user == nullptr) {
    return LoginResult(false, "Invalid username or password");
  }
  
  // Step 3: Validate password
  if (!validatePassword(user, credentials.password)) {
    return LoginResult(false, "Invalid username or password");
  }
  
  // Step 4: Login successful
  return LoginResult(true, "Login successful", user->username);
}

LoginResult LoginService::authenticate(const std::string& username, const std::string& password) {
  UserCredentials credentials(username, password);
  return authenticate(credentials);
}

