/**
 * ============================================================================
 * FRONTEND: STORE PAGE INITIALIZATION
 * ============================================================================
 * 
 * This file initializes the store page and connects it to the backend.
 * 
 * CONNECTION TO BACKEND:
 * - Sets API base URL: http://localhost:3000/api
 * - Manages JWT token storage in localStorage
 * - Creates store UI component with API configuration
 * - Handles profile updates via API
 * - Manages authentication state
 * 
 * WHY THIS FILE EXISTS:
 * - Separates page initialization from store UI logic
 * - Handles page-specific features (profile, settings, logout)
 * - Manages authentication token lifecycle
 * - Provides API configuration to store UI module
 */

// Import the store UI factory function from store.js
import { createStoreUI } from './store.js';

// ============================================================================
// API CONFIGURATION
// ============================================================================
/**
 * API_BASE_URL - Base URL for all backend API calls
 * 
 * WHY: Centralizes API endpoint configuration
 * - All API requests will go to http://localhost:3000/api/*
 * - Backend serves API endpoints at /api/* (defined in app.js)
 * - This matches the backend's route definitions
 * 
 * CONNECTION: This is the bridge between frontend and backend
 * - Frontend makes requests to this URL
 * - Backend Express server listens on localhost:3000
 * - Express routes handle requests at /api/* paths
 */
const API_BASE_URL = 'http://localhost:3000/api';

// ============================================================================
// STORE UI INITIALIZATION
// ============================================================================
/**
 * Create store UI component with backend connection configuration
 * 
 * HOW IT CONNECTS TO BACKEND:
 * 1. apiBaseUrl: Tells store UI where to send API requests
 * 2. getToken: Function that retrieves JWT token from localStorage
 *    - Token was saved during login/signup
 *    - Backend requires this token in Authorization header
 * 3. onSessionExpired: Callback when authentication fails
 *    - Happens when token is invalid/expired
 *    - Redirects user back to login page
 * 
 * WHY: The store UI module needs these functions to communicate with backend
 */
const storeUI = createStoreUI({
  apiBaseUrl: API_BASE_URL, // Where to send API requests
  getToken: () => localStorage.getItem('token'), // Get token from browser storage
  onSessionExpired: () => {
    alert('Session expired. Please log in again.');
    redirectToLogin(); // Redirect to login page
  }
});

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================
// References to HTML elements on the store page
const refs = {
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),
  logoutBtn: document.getElementById('logout-btn'),
  settingsPanel: document.getElementById('settings-panel'),
  openSettings: document.getElementById('open-settings'),
  closeSettings: document.getElementById('close-settings'),
  profileForm: document.getElementById('profile-form'),
  profileMessage: document.getElementById('profile-message'),
  confirmLogout: document.getElementById('confirm-logout'),
  navLinks: document.querySelectorAll('[data-scroll]')
};

// Profile form input fields
const profileInputs = {
  fullName: document.getElementById('profile-fullName'),
  username: document.getElementById('profile-username'),
  email: document.getElementById('profile-email'),
  bio: document.getElementById('profile-bio'),
  password: document.getElementById('profile-password')
};

// ============================================================================
// API COMMUNICATION FUNCTION
// ============================================================================
/**
 * apiFetch - Makes authenticated API requests
 * 
 * CONNECTION TO BACKEND:
 * - Constructs full URL: API_BASE_URL + endpoint
 * - Adds Authorization header with JWT token from localStorage
 * - Backend's authenticateToken middleware validates this token
 * - Returns fetch response for further processing
 * 
 * WHY: Centralizes API request logic with automatic authentication
 * Used for profile updates and other authenticated operations
 * 
 * @param {string} endpoint - API endpoint (e.g., '/profile')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
const apiFetch = (endpoint, options = {}) => {
  const token = localStorage.getItem('token'); // Get token from browser storage
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  // Add Authorization header if token exists
  // Backend expects: "Authorization: Bearer <token>"
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Make request to backend
  // Example: apiFetch('/profile', { method: 'PATCH', body: '...' })
  // Becomes: POST to http://localhost:3000/api/profile
  return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
};

/**
 * redirectToLogin - Clears authentication and redirects to login
 * WHY: Called when user logs out or session expires
 */
const redirectToLogin = () => {
  localStorage.removeItem('token'); // Clear token
  localStorage.removeItem('user');  // Clear user data
  window.location.href = 'login.html'; // Redirect to login page
};

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================
/**
 * hydrateUser - Populates UI with user data
 * WHY: Displays user info in the page header and profile form
 */
const hydrateUser = user => {
  refs.userName.textContent = user.username;
  refs.userEmail.textContent = user.email;
  populateProfileForm(user);
};

/**
 * populateProfileForm - Fills profile form with user data
 * WHY: Pre-populates form fields when editing profile
 */
const populateProfileForm = user => {
  if (!profileInputs.fullName) return;
  profileInputs.fullName.value = user.profile?.fullName || '';
  profileInputs.username.value = user.username || '';
  profileInputs.email.value = user.email || '';
  profileInputs.bio.value = user.profile?.bio || '';
  profileInputs.password.value = ''; // Never pre-fill password
};

/**
 * showProfileMessage - Displays success/error messages
 * WHY: Provides user feedback for profile updates
 */
const showProfileMessage = (message, type) => {
  if (!refs.profileMessage) return;
  refs.profileMessage.textContent = message;
  refs.profileMessage.className = `message ${type}`;
  refs.profileMessage.style.display = 'block';
};

/**
 * buildProfilePayload - Collects form data for profile update
 * WHY: Only sends fields that have values (partial updates allowed)
 */
const buildProfilePayload = () => {
  const payload = {};
  [
    ['fullName', profileInputs.fullName.value.trim()],
    ['username', profileInputs.username.value.trim()],
    ['email', profileInputs.email.value.trim()],
    ['bio', profileInputs.bio.value.trim()],
    ['password', profileInputs.password.value.trim()]
  ].forEach(([key, value]) => {
    if (value) payload[key] = value; // Only include non-empty fields
  });
  return Object.keys(payload).length ? payload : null;
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================
/**
 * attachHandlers - Sets up all event listeners for the page
 * WHY: Handles user interactions (logout, settings, profile updates)
 */
const attachHandlers = () => {
  // Logout button handlers
  refs.logoutBtn?.addEventListener('click', redirectToLogin);
  refs.confirmLogout?.addEventListener('click', redirectToLogin);

  // Settings panel toggle
  refs.openSettings?.addEventListener('click', () => {
    refs.settingsPanel?.classList.remove('hidden');
  });
  refs.closeSettings?.addEventListener('click', () => {
    refs.settingsPanel?.classList.add('hidden');
    showProfileMessage('', '');
  });

  /**
   * Profile form submission handler
   * 
   * CONNECTION TO BACKEND:
   * - PATCH request to /api/profile
   * - Requires authentication (uses apiFetch which adds token)
   * - Sends: { username, email, fullName, bio, password } (only fields that changed)
   * - Backend validates, updates user in database, returns new token
   * - Returns: { success: true, token: "...", user: {...} }
   * 
   * WHY: Allows users to update their profile information
   * 
   * NOTE: Backend returns a new token because username/email changes
   * might affect token payload. Frontend updates stored token.
   */
  refs.profileForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = buildProfilePayload();
    if (!payload) {
      showProfileMessage('Please provide at least one change before saving.', 'error');
      return;
    }

    try {
      // Send profile update to backend
      // Backend validates data, updates database, returns new token
      const response = await apiFetch('/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload) // Convert to JSON
      });
      const data = await response.json();
      if (data.success) {
        // Update stored token (backend may have issued new one)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        hydrateUser(data.user); // Update UI with new user data
        showProfileMessage('Profile updated successfully.', 'success');
      } else if (response.status === 401 || response.status === 403) {
        // Authentication failed - redirect to login
        redirectToLogin();
      } else {
        showProfileMessage(data.message || 'Unable to update profile.', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showProfileMessage('Unable to update profile right now.', 'error');
    }
  });

  // Navigation link handlers (smooth scrolling)
  refs.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
};

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================
/**
 * DOMContentLoaded event handler
 * 
 * CONNECTION TO BACKEND:
 * - Checks if user has valid token in localStorage
 * - If no token, redirects to login (user not authenticated)
 * - If token exists, loads user data and shows store UI
 * 
 * WHY: Ensures user is authenticated before showing store page
 * Also restores user session if they refresh the page
 */
window.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated (has token)
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // If no token or user data, redirect to login
  // WHY: Store page requires authentication
  if (!token || !userStr) {
    redirectToLogin();
    return;
  }

  try {
    // Parse stored user data and populate UI
    const user = JSON.parse(userStr);
    hydrateUser(user); // Display user info in header
    storeUI.showPanel(); // Show store and load data from backend
    attachHandlers(); // Set up event listeners
  } catch (error) {
    console.error('Error parsing user data:', error);
    redirectToLogin(); // If data is corrupted, redirect to login
  }
});
