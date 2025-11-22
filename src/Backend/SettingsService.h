/**
 * SettingsService - Backend class for user profile and account settings
 * C++ equivalent of routes/settings.js
 */

#ifndef SETTINGS_SERVICE_H
#define SETTINGS_SERVICE_H

#include <string>

// Validation result structure
struct ValidationResult {
    bool valid;
    std::string value;
    std::string error;

    ValidationResult() : valid(false), value(""), error("") {}
    ValidationResult(bool isValid, const std::string& val = "", const std::string& err = "")
        : valid(isValid), value(val), error(err) {}
};

// Profile update result
struct ProfileUpdateResult {
    bool success;
    std::string message;
    std::string token; // New JWT token
    std::string userId;
    std::string username;
    std::string email;
    std::string fullName;
    std::string bio;

    ProfileUpdateResult() : success(false), message(""), token(""), 
                           userId(""), username(""), email(""), 
                           fullName(""), bio("") {}
};

class SettingsService {
public:
    SettingsService();
    ~SettingsService();

    /**
     * Validate username format
     * @param username - Username to validate
     * @return Validation result
     */
    ValidationResult validateUsername(const std::string& username) const;

    /**
     * Validate email format
     * @param email - Email to validate
     * @return Validation result
     */
    ValidationResult validateEmail(const std::string& email) const;

    /**
     * Validate password
     * @param password - Password to validate
     * @return Validation result
     */
    ValidationResult validatePassword(const std::string& password) const;

    /**
     * Validate profile fields
     * @param fullName - Full name (optional)
     * @param bio - Bio (optional)
     * @return Validation result with profile object
     */
    ValidationResult validateProfile(const std::string& fullName, const std::string& bio) const;

    /**
     * Update user profile
     * @param userId - User ID to update
     * @param username - New username (optional)
     * @param email - New email (optional)
     * @param password - New password (optional)
     * @param fullName - New full name (optional)
     * @param bio - New bio (optional)
     * @return Profile update result
     */
    ProfileUpdateResult updateUserProfile(
        const std::string& userId,
        const std::string& username = "",
        const std::string& email = "",
        const std::string& password = "",
        const std::string& fullName = "",
        const std::string& bio = ""
    );

    /**
     * Generate new JWT token (simplified - use JWT library in production)
     */
    std::string generateToken(const std::string& userId, const std::string& username) const;

    /**
     * Hash password (simplified - use bcrypt library in production)
     */
    std::string hashPassword(const std::string& password) const;

private:
    /**
     * Trim whitespace from string
     */
    std::string trim(const std::string& str) const;

    /**
     * Convert string to lowercase
     */
    std::string toLower(const std::string& str) const;
};

#endif // SETTINGS_SERVICE_H

