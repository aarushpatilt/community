/**
 * ============================================================================
 * FRONTEND: AUTHENTICATION PAGE (LOGIN/SIGNUP)
 * ============================================================================
 * 
 * This file handles user authentication (login and signup).
 * 
 * CONNECTION TO BACKEND:
 * - POST requests to /api/login and /api/signup
 * - Sends credentials (username, email, password)
 * - Receives JWT token and user data from backend
 * - Stores token in localStorage for future authenticated requests
 * - Redirects to store page after successful authentication
 * 
 * WHY THIS FILE EXISTS:
 * - Handles initial authentication flow
 * - Manages token storage
 * - Provides user feedback for login/signup errors
 * - Redirects authenticated users away from login page
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================
/**
 * API_BASE_URL - Base URL for backend API
 * 
 * CONNECTION TO BACKEND:
 * - All authentication requests go to http://localhost:3000/api/*
 * - Backend handles /api/login and /api/signup endpoints
 * - Backend validates credentials and returns JWT token
 * 
 * WHY: Centralizes API endpoint configuration
 */
const API_BASE_URL = 'http://localhost:3000/api';

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================
/**
 * showMessage - Displays success/error messages to user
 * WHY: Provides feedback for login/signup attempts
 */
const showMessage = (el, message, type) => {
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
  el.style.display = 'block';
};

/**
 * setLoading - Shows/hides loading state on form
 * WHY: Prevents double-submission and shows user that request is processing
 */
const setLoading = (form, loading) => {
  const button = form.querySelector('button[type="submit"]');
  form.classList.toggle('loading', loading);
  if (button) button.disabled = loading;
};

/**
 * persistSession - Saves authentication token and user data to browser storage
 * 
 * CONNECTION TO BACKEND:
 * - Token received from backend after successful login/signup
 * - Token is stored in localStorage for future API requests
 * - User data is also stored for displaying user info
 * 
 * WHY: 
 * - Token allows frontend to make authenticated API requests
 * - localStorage persists across page refreshes
 * - User data allows UI to display username/email without extra API call
 */
const persistSession = (token, user) => {
  localStorage.setItem('token', token); // Store JWT token
  localStorage.setItem('user', JSON.stringify(user)); // Store user data
};

/**
 * redirectToStore - Redirects user to store page after authentication
 * WHY: Store page is the main application page after login
 */
const redirectToStore = () => {
  window.location.href = 'store.html';
};

// ============================================================================
// AUTHENTICATION HANDLER
// ============================================================================
/**
 * handleAuth - Generic handler for both login and signup
 * 
 * CONNECTION TO BACKEND:
 * - Makes POST request to /api/login or /api/signup
 * - Sends credentials as JSON in request body
 * - Backend validates credentials and returns response
 * 
 * BACKEND RESPONSE (on success):
 * {
 *   success: true,
 *   token: "jwt-token-here",
 *   user: { id, username, email },
 *   message: "Login successful" or "User created successfully"
 * }
 * 
 * BACKEND RESPONSE (on error):
 * {
 *   success: false,
 *   message: "Error description"
 * }
 * 
 * WHY: Reduces code duplication between login and signup flows
 * 
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.form - Form element to attach handler to
 * @param {string} config.endpoint - API endpoint ('login' or 'signup')
 * @param {HTMLElement} config.messageEl - Element to display messages
 * @param {Function} config.buildPayload - Function to extract form data
 */
const handleAuth = async ({ form, endpoint, messageEl, buildPayload }) => {
  form.addEventListener('submit', async event => {
    event.preventDefault(); // Prevent default form submission
    
    // Extract form data using provided function
    const payload = buildPayload(new FormData(form));
    
    // Show loading state
    setLoading(form, true);
    showMessage(messageEl, '', ''); // Clear previous messages

    try {
      /**
       * MAKE API REQUEST TO BACKEND
       * 
       * HOW IT CONNECTS:
       * 1. Constructs URL: http://localhost:3000/api/login or /api/signup
       * 2. Sets method to POST
       * 3. Sets Content-Type header to application/json
       * 4. Converts payload to JSON string in request body
       * 5. Backend receives request, processes it, returns response
       * 
       * BACKEND PROCESSING (for login):
       * - Finds user by username/email
       * - Compares password with stored hash using bcrypt
       * - If valid, generates JWT token
       * - Returns token and user data
       * 
       * BACKEND PROCESSING (for signup):
       * - Validates username/email don't exist
       * - Hashes password with bcrypt
       * - Creates new user in database
       * - Generates JWT token
       * - Returns token and user data
       */
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // Convert object to JSON string
      });
      
      // Parse JSON response from backend
      const result = await response.json();
      
      // Check success status immediately and prevent any redirect on failure
      // Backend may return "false" as string or boolean false
      const isSuccess = result.success === true || result.success === "true";
      
      if (!isSuccess) {
        /**
         * AUTHENTICATION FAILED
         * 
         * WHY: Display error message from backend
         * Backend returns descriptive error messages (e.g., "Invalid username or password")
         */
        // Clear any existing session data to prevent redirect flash
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showMessage(messageEl, result.message || 'Authentication failed', 'error');
        setLoading(form, false);
        return; // Exit early - do NOT redirect
      }
      
      /**
       * AUTHENTICATION SUCCESSFUL
       * 
       * CONNECTION TO BACKEND:
       * - Backend has validated credentials and created/verified user
       * - Backend has generated JWT token containing user ID and username
       * - Token will be used for all future authenticated API requests
       * 
       * WHY: Store token so frontend can make authenticated requests
       */
      // Only persist session and redirect if we're sure it's successful
      if (result.token && result.user) {
        persistSession(result.token, result.user); // Save token and user data
        showMessage(messageEl, result.message || 'Success', 'success');
        
        // Only redirect on success - this code only runs if result.success is true
        setTimeout(() => {
          // Double-check token exists before redirecting
          if (localStorage.getItem('token')) {
            redirectToStore();
          }
        }, 400);
      } else {
        // Missing token or user data - treat as failure
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showMessage(messageEl, result.message || 'Authentication failed - missing token', 'error');
        setLoading(form, false);
      }
    } catch (error) {
      /**
       * NETWORK ERROR
       * 
       * WHY: Handle cases where backend is unreachable
       * Could be server down, network issue, CORS problem, etc.
       */
      console.error(`${endpoint} error:`, error);
      showMessage(messageEl, 'Network error. Please check the server.', 'error');
    } finally {
      // Always remove loading state, even if request failed
      setLoading(form, false);
    }
  });
};

// ============================================================================
// FORM INITIALIZATION
// ============================================================================
/**
 * Initialize login form handler
 * 
 * CONNECTION TO BACKEND:
 * - POST /api/login
 * - Sends: { username, password }
 * - Backend allows login with username OR email
 * 
 * WHY: Sets up login form to communicate with backend
 */
if (loginForm) {
  handleAuth({
    form: loginForm,
    endpoint: 'login', // Backend endpoint: /api/login
    messageEl: document.getElementById('login-message'),
    buildPayload: formData => ({
      username: formData.get('username'), // Can be username or email
      password: formData.get('password')
    })
  });
}

/**
 * Initialize signup form handler
 * 
 * CONNECTION TO BACKEND:
 * - POST /api/signup
 * - Sends: { username, email, password }
 * - Backend validates, hashes password, creates user, returns token
 * 
 * WHY: Sets up signup form to communicate with backend
 */
if (signupForm) {
  handleAuth({
    form: signupForm,
    endpoint: 'signup', // Backend endpoint: /api/signup
    messageEl: document.getElementById('signup-message'),
    buildPayload: formData => ({
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password')
    })
  });
}

// ============================================================================
// PAGE LOAD CHECK
// ============================================================================
/**
 * Check if user is already authenticated when page loads
 * 
 * CONNECTION TO BACKEND:
 * - Checks localStorage for existing token
 * - If token exists, user is already logged in
 * - Redirects to store page (no need to show login page)
 * 
 * WHY: Prevents authenticated users from seeing login page
 * Improves user experience by skipping unnecessary step
 */
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // If user is already authenticated, redirect to store
  // WHY: Don't show login page if user is already logged in
  if (token && userStr && window.location.pathname !== '/store.html') {
    redirectToStore();
  }
});
