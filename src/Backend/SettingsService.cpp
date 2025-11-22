/**
 * SettingsService - Implementation
 * C++ equivalent of routes/settings.js
 */

#include "SettingsService.h"
#include <algorithm>
#include <regex>
#include <ctime>
#include <sstream>
#include <iomanip>

SettingsService::SettingsService() = default;
SettingsService::~SettingsService() = default;

std::string SettingsService::trim(const std::string& str) const {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

std::string SettingsService::toLower(const std::string& str) const {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string SettingsService::generateToken(const std::string& userId, const std::string& username) const {
    // Simplified token generation - use JWT library in production
    std::ostringstream oss;
    oss << "token_" << username << "_" << userId << "_" << time(nullptr);
    return oss.str();
}

std::string SettingsService::hashPassword(const std::string& password) const {
    // Simplified - use bcrypt library in production
    // For now, just return as-is (NOT SECURE - implement proper hashing!)
    return password;
}

ValidationResult SettingsService::validateUsername(const std::string& username) const {
    if (username.empty()) {
        return ValidationResult(false, "", "Username is required");
    }

    std::string trimmed = trim(username);
    if (trimmed.length() < 3 || trimmed.length() > 30) {
        return ValidationResult(false, "", "Username must be 3-30 characters");
    }

    return ValidationResult(true, trimmed);
}

ValidationResult SettingsService::validateEmail(const std::string& email) const {
    if (email.empty()) {
        return ValidationResult(false, "", "Email is required");
    }

    // Email regex pattern
    std::regex emailRegex(R"([^\s@]+@[^\s@]+\.[^\s@]+)");
    std::string trimmed = trim(email);
    std::string lower = toLower(trimmed);

    if (!std::regex_match(lower, emailRegex)) {
        return ValidationResult(false, "", "Invalid email format");
    }

    return ValidationResult(true, lower);
}

ValidationResult SettingsService::validatePassword(const std::string& password) const {
    if (password.empty()) {
        return ValidationResult(false, "", "Password is required");
    }

    if (password.length() < 6) {
        return ValidationResult(false, "", "Password must be at least 6 characters long");
    }

    return ValidationResult(true, password);
}

ValidationResult SettingsService::validateProfile(const std::string& fullName, const std::string& bio) const {
    std::string trimmedFullName = trim(fullName);
    std::string trimmedBio = trim(bio);

    if (!trimmedFullName.empty() && trimmedFullName.length() > 80) {
        return ValidationResult(false, "", "Full name must be 80 characters or less");
    }

    if (!trimmedBio.empty() && trimmedBio.length() > 160) {
        return ValidationResult(false, "", "Bio must be 160 characters or less");
    }

    // Return success (profile fields are optional)
    return ValidationResult(true, "");
}

ProfileUpdateResult SettingsService::updateUserProfile(
    const std::string& userId,
    const std::string& username,
    const std::string& email,
    const std::string& password,
    const std::string& fullName,
    const std::string& bio
) {
    ProfileUpdateResult result;

    // This is a placeholder - in real implementation, you would:
    // 1. Find user in database by userId
    // 2. Check for username/email conflicts
    // 3. Hash password if provided
    // 4. Update user fields
    // 5. Save to database
    // 6. Generate new JWT token

    // For now, return a basic result
    result.success = false;
    result.message = "Profile update not fully implemented - needs database integration";

    return result;
}

