/**
 * LoginService - Backend class for handling login authentication
 */

#ifndef LOGIN_SERVICE_H
#define LOGIN_SERVICE_H

#include <string>

// Structure to hold login credentials
struct UserCredentials {
  std::string username;
  std::string password;
  
  UserCredentials(const std::string& user, const std::string& pass)
    : username(user), password(pass) {}
  
  bool isValid() const {
    return !username.empty() && !password.empty();
  }
};

// Structure to hold login result
struct LoginResult {
  bool success;
  std::string message;
  std::string username;
  
  LoginResult() : success(false), message(""), username("") {}
  LoginResult(bool s, const std::string& msg, const std::string& user = "")
    : success(s), message(msg), username(user) {}
};

// Main LoginService class
class LoginService {
private:
  // In-memory user database (for testing purposes)
  // In production, this would connect to a real database
  struct User {
    std::string username;
    std::string password;
    
    User(const std::string& user, const std::string& pass)
      : username(user), password(pass) {}
  };
  
  // Mock user database
  static const User validUsers[];
  static const int userCount;
  
  // Helper method to find user in database
  const User* findUser(const std::string& username) const;
  
  // Helper method to validate password
  bool validatePassword(const User* user, const std::string& password) const;

public:
  LoginService();
  ~LoginService();
  
  // Main login method
  LoginResult authenticate(const UserCredentials& credentials);
  
  // Overloaded method for direct username/password
  LoginResult authenticate(const std::string& username, const std::string& password);
  
  // Validate credentials format
  bool validateCredentialsFormat(const UserCredentials& credentials) const;
};

#endif // LOGIN_SERVICE_H

