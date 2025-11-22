/**
 * Figma App - Complete Integration
 * Connects Figma design with backend functionality
 */

import { createStoreUI } from './store.js';

const API_BASE_URL = 'http://localhost:3000/api';

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================

// Make showView available immediately for inline onclick handlers
window.showView = function showView(viewId) {
    document.querySelectorAll('.view-screen').forEach(view => {
        view.classList.remove('active');
    });
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
        // Scroll to top when switching views
        window.scrollTo(0, 0);
        
        // Set up signup form when signup view is shown
        if (viewId === 'signup-view') {
            setTimeout(() => {
                setupSignupForm();
            }, 100);
        }
    }
};

function showLoginForm() {
    // Welcome view already has login form, just scroll to it or keep on welcome view
    showView('welcome-view');
    // Scroll to login form if needed
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function showMessage(message, type = 'info') {
    const msgEl = document.getElementById('global-message');
    const currentView = document.querySelector('.view-screen.active');
    
    // Don't show messages on signup page
    if (currentView && currentView.id === 'signup-view') {
        return;
    }
    
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.className = `message ${type}`;
        msgEl.style.display = 'block';
        setTimeout(() => {
            msgEl.style.display = 'none';
        }, 5000);
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function persistSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateLoginStatus();
    showView('welcome-view');
    showMessage('Logged out successfully', 'success');
}

function updateLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        document.body.classList.add('logged-in');
    } else {
        document.body.classList.remove('logged-in');
    }
}

// Login form handler - handles login from welcome view
window.handleLogin = function handleLogin(event) {
    console.log('handleLogin called');
    if (event) {
        event.preventDefault();
    }
    
    const usernameEl = document.getElementById('login-username');
    const passwordEl = document.getElementById('login-password');
    
    if (!usernameEl || !passwordEl) {
        console.error('Login form elements not found');
        showMessage('Form not ready. Please refresh the page.', 'error');
        return;
    }
    
    const username = usernameEl.value?.trim();
    const password = passwordEl.value;
    
    console.log('Login attempt:', { username: username ? '***' : 'empty', hasPassword: !!password });
    
    if (!username || !password) {
        showMessage('Please enter username and password', 'error');
        return;
    }
    
    (async () => {
        try {
            console.log('Sending login request to:', `${API_BASE_URL}/login`);
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            console.log('Login response status:', response.status);
            const result = await response.json();
            console.log('Login response:', result);
            
            const isSuccess = result.success === true || result.success === "true";
            
            if (!isSuccess) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                updateLoginStatus();
                showMessage(result.message || 'Login failed', 'error');
                return;
            }
            
            // Handle both response formats (with user object or flat structure)
            if (result.token) {
                const user = result.user || {
                    id: result.user_id || username,
                    username: result.username || username,
                    email: result.email || ''
                };
                
                persistSession(result.token, user);
                updateLoginStatus();
                showMessage('Login successful!', 'success');
                setTimeout(() => {
                    showView('store-view');
                    if (typeof initializeStore === 'function') {
                        initializeStore();
                    }
                }, 500);
            } else {
                showMessage('Login failed - missing token', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please check the server.', 'error');
        }
    })();
};

// Attach login handler to form (works for both welcome and any login views)
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Check if handler is already attached
        if (loginForm.dataset.handlerAttached === 'true') {
            return;
        }
        
        loginForm.addEventListener('submit', handleLogin);
        loginForm.dataset.handlerAttached = 'true';
    }
}

// Set up login form when DOM is ready
setupLoginForm();
window.addEventListener('DOMContentLoaded', () => {
    setupLoginForm();
});

// Signup form handler - ensure it's attached when DOM is ready
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Check if handler is already attached to avoid duplicates
        if (signupForm.dataset.handlerAttached === 'true') {
            return;
        }
        
        // Add form submit handler
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const username = document.getElementById('signup-username')?.value?.trim();
            const email = document.getElementById('signup-email')?.value?.trim();
            const password = document.getElementById('signup-password')?.value;
            const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
            
            if (!username || !email || !password || !passwordConfirm) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== passwordConfirm) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long', 'error');
                return;
            }
            
            await submitSignupForm(username, email, password);
        });
        
        // Mark as attached
        signupForm.dataset.handlerAttached = 'true';
        
        // Ensure button click handler is also set up (don't clone - preserve onclick)
        const signupButton = document.getElementById('signup-button');
        if (signupButton && !signupButton.dataset.handlerAttached) {
            // Add event listener in addition to onclick (for reliability)
            signupButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSignupButtonClick(event);
            });
            // Ensure onclick attribute is set
            if (!signupButton.getAttribute('onclick')) {
                signupButton.setAttribute('onclick', 'handleSignupButtonClick(event)');
            }
            signupButton.dataset.handlerAttached = 'true';
        }
    }
}

// Handle signup button click directly - this is called from the button's onclick
window.handleSignupButtonClick = function handleSignupButtonClick(event) {
    console.log('Signup button clicked');
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Get form values directly
    const username = document.getElementById('signup-username')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
    
    console.log('Form values:', { username, email, hasPassword: !!password, hasPasswordConfirm: !!passwordConfirm });
    
    // Validate
    if (!username || !email || !password || !passwordConfirm) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Submit directly - don't rely on form submit event
    console.log('Submitting signup form directly');
    submitSignupForm(username, email, password);
};

// Extract signup submission logic to reusable function - make it available globally
window.submitSignupForm = async function submitSignupForm(username, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        const isSuccess = result.success === true || result.success === "true";
        
        if (!isSuccess) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            updateLoginStatus();
            showMessage(result.message || 'Signup failed', 'error');
            return;
        }
        
        if (result.token && result.user) {
            persistSession(result.token, result.user);
            updateLoginStatus();
            showMessage('Account created successfully!', 'success');
            setTimeout(() => {
                showView('store-view');
                initializeStore();
            }, 500);
        } else {
            showMessage('Signup failed - missing token', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please check the server.', 'error');
    }
}

// Update setupSignupForm to use the extracted function
function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Check if handler is already attached
        if (signupForm.dataset.handlerAttached === 'true') {
            return; // Already set up
        }
        
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const username = document.getElementById('signup-username')?.value?.trim();
            const email = document.getElementById('signup-email')?.value?.trim();
            const password = document.getElementById('signup-password')?.value;
            const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
            
            if (!username || !email || !password || !passwordConfirm) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== passwordConfirm) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long', 'error');
                return;
            }
            
            await submitSignupForm(username, email, password);
        });
        
        // Mark as attached
        signupForm.dataset.handlerAttached = 'true';
        
        // Also set up button click handler
        const signupButton = document.getElementById('signup-button');
        if (signupButton && !signupButton.dataset.handlerAttached) {
            signupButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSignupButtonClick(event);
            });
            signupButton.dataset.handlerAttached = 'true';
        }
    }
}

// Set up signup form when DOM is ready
setupSignupForm();
// Also set up when signup view is shown (in case form is dynamically loaded)
window.addEventListener('DOMContentLoaded', () => {
    setupSignupForm();
});

// ============================================================================
// STORE FUNCTIONALITY
// ============================================================================

// Track current search to prevent double rendering and race conditions
let currentSearchQuery = null;
let currentSearchId = 0;
let searchAbortController = null;

// Helper function to clean up search title
function removeSearchTitle() {
    const catalogList = document.getElementById('catalog-list');
    if (catalogList && catalogList.parentElement) {
        // Remove all titles that might exist (in case of duplicates)
        const siblings = Array.from(catalogList.parentElement.children);
        siblings.forEach(sibling => {
            if (sibling !== catalogList && 
                (sibling.id === 'search-results-title' || 
                 (sibling.textContent && sibling.textContent.includes('Search Results')))) {
                sibling.remove();
            }
        });
    }
}

// Helper function to add search title
function addSearchTitle() {
    const catalogList = document.getElementById('catalog-list');
    if (catalogList) {
        // Remove existing title first
        removeSearchTitle();
        
        const title = document.createElement('p');
        title.id = 'search-results-title';
        title.style.cssText = 'position: absolute; top: 300px; left: 50%; transform: translateX(-50%); width: 935px; color: rgba(22,79,27,1); font-family: Inria Serif, serif; font-size: 64px; text-align: center; margin: 0 0 20px 0; z-index: 10;';
        title.textContent = 'Search Results';
        catalogList.parentElement.insertBefore(title, catalogList);
    }
}

// Helper function to perform search - make it globally accessible
window.performSearch = function performSearch(query) {
    console.log('performSearch called with query:', query);
    const catalogList = document.getElementById('catalog-list');
    const startSearchText = document.getElementById('start-search-text');
    
    if (!query || !query.trim()) {
        console.log('Empty query, loading catalog');
        // Cancel any pending search
        if (searchAbortController) {
            searchAbortController.abort();
            searchAbortController = null;
        }
        currentSearchQuery = null;
        currentSearchId++;
        removeSearchTitle();
        if (startSearchText) startSearchText.style.display = 'block';
        if (catalogList) catalogList.innerHTML = '';
        loadCatalog();
        return;
    }
    
    const trimmedQuery = query.trim();
    
    // Cancel previous search if it's still running
    if (searchAbortController) {
        searchAbortController.abort();
    }
    
    // Create new abort controller for this search
    searchAbortController = new AbortController();
    const searchId = ++currentSearchId;
    currentSearchQuery = trimmedQuery;
    
    // Hide "Start Your Search" text when searching - do this immediately and forcefully
    if (startSearchText) {
        startSearchText.style.setProperty('display', 'none', 'important');
        startSearchText.style.setProperty('visibility', 'hidden', 'important');
        startSearchText.style.setProperty('opacity', '0', 'important');
        startSearchText.classList.add('hidden');
        console.log('Hiding start search text');
    }
    
    // Clear old results and title immediately when new search starts to prevent overlap/flash
    // This must happen synchronously before any async operations
    if (catalogList) {
        // Remove all child nodes completely
        while (catalogList.firstChild) {
            catalogList.removeChild(catalogList.firstChild);
        }
    }
    removeSearchTitle();
    
    // Get SAMPLE_PRODUCTS - make sure it's available
    const sampleProducts = window.SAMPLE_PRODUCTS || (typeof SAMPLE_PRODUCTS !== 'undefined' ? SAMPLE_PRODUCTS : []);
    
    // Try API search first, fall back to local search if API fails
    (async () => {
        // Check immediately if search was cancelled before doing any work
        if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
            console.log('Search was cancelled before starting');
            return;
        }
        
        let resultsToRender = null;
        
        try {
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}`, {
                signal: searchAbortController.signal
            });
            
            // Check again after fetch completes
            if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
                console.log('Search was cancelled during fetch, ignoring results');
                return;
            }
            
            const data = await response.json();
            
            // Check again after parsing JSON
            if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
                console.log('Search was cancelled after fetch, ignoring results');
                return;
            }
            
            if (data.success && data.results && data.results.length > 0) {
                console.log('API returned results:', data.results.length);
                resultsToRender = data.results;
            }
        } catch (error) {
            // Ignore abort errors
            if (error.name === 'AbortError') {
                console.log('Search was cancelled');
                return;
            }
            console.error('API search error (using sample products):', error);
        }
        
        // Check again if search is still current before doing local search
        if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
            console.log('Search was cancelled or superseded, ignoring local search');
            return;
        }
        
        // Fall back to local search if API didn't return results
        if (!resultsToRender && sampleProducts && sampleProducts.length > 0) {
            const queryLower = trimmedQuery.toLowerCase();
            const localResults = sampleProducts.filter(p => {
                // Check during filtering if search was cancelled
                if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
                    return false;
                }
                if (!p) return false;
                const nameMatch = p.name && p.name.toLowerCase().includes(queryLower);
                const descMatch = p.description && p.description.toLowerCase().includes(queryLower);
                return nameMatch || descMatch;
            });
            
            // Final check before using local results
            if (currentSearchId === searchId && currentSearchQuery === trimmedQuery) {
                if (localResults.length > 0) {
                    console.log('Using local filtered results:', localResults.length);
                    resultsToRender = localResults;
                }
            } else {
                console.log('Search was cancelled during local search, ignoring results');
                return;
            }
        }
        
        // Final check before rendering - must be the exact same search
        // Double-check that this search is still current (prevent race conditions)
        if (currentSearchId === searchId && currentSearchQuery === trimmedQuery) {
            // One more check right before DOM manipulation to prevent flash
            if (currentSearchId !== searchId || currentSearchQuery !== trimmedQuery) {
                console.log('Search was superseded at the last moment, ignoring render');
                return;
            }
            
            if (resultsToRender && resultsToRender.length > 0) {
                // Ensure catalog list is clear before rendering (defensive check)
                if (catalogList) {
                    while (catalogList.firstChild) {
                        catalogList.removeChild(catalogList.firstChild);
                    }
                }
                removeSearchTitle();
                renderSearchResults(resultsToRender);
                addSearchTitle();
            } else {
                console.log('No results found');
                // Clear completely
                if (catalogList) {
                    while (catalogList.firstChild) {
                        catalogList.removeChild(catalogList.firstChild);
                    }
                    catalogList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; text-align: center; margin-top: 100px;">No results found</p>';
                }
                removeSearchTitle();
            }
        } else {
            console.log('Search results ignored - newer search in progress');
        }
    })();
}

let storeUI = null;

function initializeStore() {
    if (!storeUI) {
        // Create store UI with Figma-specific DOM references
        storeUI = createStoreUI({
            apiBaseUrl: API_BASE_URL,
            getToken: () => localStorage.getItem('token'),
            onSessionExpired: () => {
                showMessage('Session expired. Please log in again.', 'error');
                logout();
            }
        });
        
        // Override DOM references for Figma design
        const figmaRefs = {
            panel: document.getElementById('store-view'),
            catalog: document.getElementById('catalog-list'),
            cart: document.getElementById('cart-list'),
            history: document.getElementById('history-list'),
            total: document.getElementById('cart-total'),
            message: document.getElementById('global-message'),
            checkout: null, // Will be handled separately
            refresh: null,
            clear: null,
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('catalog-search'),
            clearSearch: null,
            checkoutDetails: null
        };
        
        // Update store.js refs if possible (this is a workaround)
        // The store UI will use these elements
    }
    
    // Show store view and load data
    showView('store-view');
    if (storeUI) {
        storeUI.showPanel();
    }
    
    // Add navigation buttons if they don't exist
    addNavigationButtons();
    
    // Set up search form - ensure it works properly
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('catalog-search');
    const startSearchText = document.getElementById('start-search-text');
    
    // Set up search functionality - ensure it works even if DOM isn't ready
    // Store handlers and timeout in module scope to prevent duplicates
    let searchHandlersSetup = false;
    let searchTimeout = null;
    let searchFormHandler = null;
    let searchInputHandler = null;
    let searchButtonHandler = null;
    
    function setupSearchHandlers() {
        // Only set up once to prevent duplicate listeners
        if (searchHandlersSetup) {
            return;
        }
        
        const form = document.getElementById('search-form');
        const input = document.getElementById('catalog-search');
        const startText = document.getElementById('start-search-text');
        const searchButton = document.querySelector('#store-view .v1_64');
        
        if (!form || !input) {
            return; // DOM not ready yet
        }
        
        console.log('Setting up search handlers:', { form: !!form, input: !!input, searchButton: !!searchButton, performSearch: typeof performSearch });
        
        // Form submit handler
        if (form) {
            searchFormHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const query = input.value.trim();
                console.log('Form submit handler - query:', query);
                
                // Clear any pending timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }
                
                if (!query) {
                    if (startText) startText.style.display = 'block';
                    loadCatalog();
                    return false;
                }
                if (startText) startText.style.display = 'none';
                if (typeof performSearch === 'function') {
                    performSearch(query);
                } else {
                    console.error('performSearch function not available');
                }
                return false;
            };
            form.addEventListener('submit', searchFormHandler);
        }
        
        // Real-time search as user types
        if (input) {
            searchInputHandler = () => {
                const query = input.value.trim();
                console.log('Input event - query:', query);
                
                // Clear previous timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }
                
                if (!query) {
                    if (startText) startText.style.display = 'block';
                    loadCatalog();
                    return;
                }
                
                if (startText) startText.style.display = 'none';
                
                // Debounce search - wait 300ms after user stops typing
                searchTimeout = setTimeout(() => {
                    console.log('Performing search for:', query);
                    if (typeof performSearch === 'function') {
                        performSearch(query);
                    } else {
                        console.error('performSearch function not available');
                    }
                    searchTimeout = null;
                }, 300);
            };
            input.addEventListener('input', searchInputHandler);
        }
        
        // Search button click handler
        if (searchButton) {
            searchButtonHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Clear any pending timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }
                
                const query = input.value.trim();
                console.log('Search button clicked (event listener) - query:', query);
                if (query) {
                    if (startText) startText.style.display = 'none';
                    if (typeof performSearch === 'function') {
                        performSearch(query);
                    } else {
                        console.error('performSearch function not available');
                    }
                } else {
                    if (startText) startText.style.display = 'block';
                    loadCatalog();
                }
                return false;
            };
            searchButton.addEventListener('click', searchButtonHandler);
        }
        
        searchHandlersSetup = true;
    }
    
    // Set up search handlers - try multiple times to ensure DOM is ready
    setupSearchHandlers();
    setTimeout(setupSearchHandlers, 100);
    setTimeout(setupSearchHandlers, 500);
    
    // Set up global buy button handler using event delegation
    // This ensures buy buttons work everywhere (catalog, search results, etc.)
    setupBuyButtonHandler();
    
    // Load initial data (only if no search query)
    const currentSearchValue = searchInput ? searchInput.value.trim() : '';
    if (!currentSearchValue) {
        loadCatalog();
    } else {
        // If there's already a search query, perform the search
        performSearch(currentSearchValue);
    }
    loadCart();
    loadHistory();
}

function renderSearchResults(results) {
    const catalogList = document.getElementById('catalog-list');
    const startSearchText = document.getElementById('start-search-text');
    if (!catalogList) return;
    
    // Always hide "Start Your Search" text when showing results - use multiple methods
    if (startSearchText) {
        startSearchText.style.setProperty('display', 'none', 'important');
        startSearchText.style.setProperty('visibility', 'hidden', 'important');
        startSearchText.style.setProperty('opacity', '0', 'important');
        startSearchText.classList.add('hidden');
        console.log('renderSearchResults: Hiding start search text');
    }
    
    // Remove search title first to prevent duplicates
    removeSearchTitle();
    
    if (!results || results.length === 0) {
        // Clear completely before showing no results
        while (catalogList.firstChild) {
            catalogList.removeChild(catalogList.firstChild);
        }
        catalogList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; text-align: center; margin-top: 100px;">No results found</p>';
        return;
    }
    
    // Clear any existing content completely to prevent overlay
    // Use removeChild to ensure all nodes are removed
    while (catalogList.firstChild) {
        catalogList.removeChild(catalogList.firstChild);
    }
    
    // Match Figma design: items with image placeholder, "Search Result" text, description, price, and "Buy" button
    catalogList.innerHTML = results.map((item, index) => {
        const productId = String(item.id).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
        <div class="v1_${150 + index * 8}" style="position: relative; width: 100%; height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px; cursor: pointer;" data-product-id="${item.id}">
            <div style="width: 150px; height: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif;">Image</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1);">${item.name || 'Search Result'}</h3>
                <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">${item.description || 'Item description.'}</p>
                <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">$${item.price ? item.price.toFixed(2) : 'Price'}</p>
            </div>
            <button data-product-id="${item.id}" class="buy-button" onclick="event.stopPropagation(); if(window.addToCart && typeof window.addToCart === 'function') { window.addToCart('${productId}'); } else { console.error('addToCart not available'); }" style="width: 133px; height: 100px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 20px; cursor: pointer; font-family: Inter, sans-serif; font-size: 32px; margin-left: 20px;">Buy</button>
        </div>
        `;
    }).join('');
    
    // Use event delegation on the catalog list for better reliability
    // Remove any existing listener first
    catalogList.removeEventListener('click', handleProductClick);
    catalogList.addEventListener('click', handleProductClick);
    
    // Add event delegation for Buy buttons - use capture phase for better reliability
    catalogList.removeEventListener('click', handleBuyButtonClick, true);
    catalogList.addEventListener('click', handleBuyButtonClick, true);
    
    // Also ensure the global handler is set up
    setupBuyButtonHandler();
}

// Event handler for Buy button clicks (event delegation)
function handleBuyButtonClick(e) {
    console.log('handleBuyButtonClick called', e.target, e.target.className);
    
    // Check if clicked element is a Buy button or inside one
    const buyButton = e.target.closest('.buy-button');
    if (!buyButton) {
        // Also check if the target itself is a buy button
        if (e.target.classList && e.target.classList.contains('buy-button')) {
            // Target is the button itself
            const btn = e.target;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            handleBuyButtonAction(btn);
            return;
        }
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    handleBuyButtonAction(buyButton);
}

function handleBuyButtonAction(buyButton) {
    
    // Prevent multiple rapid clicks
    if (buyButton.disabled) {
        console.log('Buy button already processing, ignoring click');
        return;
    }
    
    const productId = buyButton.getAttribute('data-product-id');
    if (!productId) {
        console.error('Buy button clicked but no productId found', buyButton);
        return;
    }
    
    // Disable button immediately to prevent double-clicks
    buyButton.disabled = true;
    buyButton.style.opacity = '0.6';
    buyButton.style.cursor = 'wait';
    
    console.log('Buy button clicked for product:', productId);
    
    // Check for addToCart function
    const addToCartFunc = window.addToCart;
    if (!addToCartFunc || typeof addToCartFunc !== 'function') {
        console.error('addToCart function not available', { addToCart: window.addToCart, type: typeof window.addToCart });
        showMessage('Unable to add item to cart. Please refresh the page.', 'error');
        // Re-enable button
        buyButton.disabled = false;
        buyButton.style.opacity = '1';
        buyButton.style.cursor = 'pointer';
        return;
    }
    
    // Call addToCart - it's async, so handle it properly
    Promise.resolve(addToCartFunc(productId))
        .then(() => {
            // Success - button will be re-enabled after delay
            console.log('addToCart completed successfully');
        })
        .catch((error) => {
            console.error('Error calling addToCart:', error);
            showMessage('Failed to add item to cart', 'error');
        })
        .finally(() => {
            // Re-enable button after a delay
            setTimeout(() => {
                buyButton.disabled = false;
                buyButton.style.opacity = '1';
                buyButton.style.cursor = 'pointer';
            }, 1000);
        });
}

// Event handler for product item clicks (event delegation)
function handleProductClick(e) {
    // Don't trigger if clicking the Buy button - check this first
    if (e.target.tagName === 'BUTTON' || e.target.closest('.buy-button') || e.target.classList.contains('buy-button')) {
        return;
    }
    
    // Find the product item div (closest element with data-product-id)
    const productItem = e.target.closest('[data-product-id]');
    if (!productItem) return;
    
    const productId = productItem.getAttribute('data-product-id');
    if (productId) {
        console.log('Opening product details for:', productId);
        if (typeof showProductDetails === 'function') {
            showProductDetails(productId);
        } else if (typeof window.showProductDetails === 'function') {
            window.showProductDetails(productId);
        } else {
            console.error('showProductDetails function not found');
        }
    }
}

// Product detail modal function - make it globally accessible immediately
window.showProductDetails = function showProductDetails(productId) {
    console.log('showProductDetails called with productId:', productId, 'Type:', typeof productId);
    const sampleProducts = window.SAMPLE_PRODUCTS || [];
    
    // Try to find product - handle both string and number IDs
    let product = sampleProducts.find(p => {
        // Compare as strings to handle both '1' and 1
        return String(p.id) === String(productId);
    });
    
    // If not found in sample products, try to get from rendered HTML
    if (!product) {
        console.log('Product not in SAMPLE_PRODUCTS, trying to extract from DOM');
        const catalogList = document.getElementById('catalog-list');
        if (catalogList) {
            // Try exact match first
            let productItem = catalogList.querySelector(`[data-product-id="${productId}"]`);
            // If not found, try with escaped quotes
            if (!productItem) {
                productItem = catalogList.querySelector(`[data-product-id='${productId}']`);
            }
            
            if (productItem) {
                console.log('Found product item in DOM');
                // Extract product info from the rendered HTML
                const nameEl = productItem.querySelector('h3');
                const descEl = productItem.querySelectorAll('p')[0]; // First p is description
                const priceEl = productItem.querySelectorAll('p')[1]; // Second p is price
                
                if (nameEl) {
                    const name = nameEl.textContent.trim();
                    const description = descEl ? descEl.textContent.trim() : 'No description available.';
                    let price = 0;
                    if (priceEl) {
                        const priceText = priceEl.textContent.replace('$', '').trim();
                        price = parseFloat(priceText) || 0;
                    }
                    
                    product = {
                        id: String(productId),
                        name: name,
                        description: description,
                        price: price
                    };
                    console.log('Extracted product from DOM:', product);
                }
            } else {
                console.log('Product item not found in DOM with ID:', productId);
            }
        }
    }
    
    if (!product) {
        console.error('Product not found:', productId, 'Type:', typeof productId);
        console.error('Available sample products:', sampleProducts.map(p => ({ id: p.id, type: typeof p.id })));
        // Show a user-friendly message instead of alert
        const modal = document.getElementById('product-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        return;
    }
    
    console.log('Found product:', product);
    
    // Create modal overlay
    let modal = document.getElementById('product-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'product-detail-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeProductDetails();
            }
        });
    }
    
    // Create modal content using innerHTML for simplicity
    modal.innerHTML = `
        <div style="position: relative; width: 90%; max-width: 800px; background: white; border-radius: 20px; padding: 40px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <button id="close-product-modal" style="position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; background: rgba(217,217,217,1); border: none; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; color: rgba(0,0,0,1); display: flex; align-items: center; justify-content: center;">×</button>
            <div style="display: flex; flex-direction: column; gap: 30px;">
                <div style="width: 100%; height: 300px; background: rgba(217,217,217,1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">Product Image</div>
                <div>
                    <h2 style="margin: 0 0 20px 0; font-family: Inter, sans-serif; font-size: 48px; color: rgba(0,0,0,1); font-weight: bold;">${product.name || 'Product'}</h2>
                    <p style="margin: 0 0 20px 0; font-family: Inter, sans-serif; font-size: 36px; color: rgba(0,0,0,0.7); line-height: 1.6;">${product.description || 'No description available.'}</p>
                    <p style="margin: 20px 0; font-family: Inter, sans-serif; font-size: 42px; color: rgba(22,79,27,1); font-weight: bold;">$${product.price ? product.price.toFixed(2) : '0.00'}</p>
                    <button id="add-to-cart-from-modal" data-product-id="${product.id}" style="width: 200px; height: 80px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 20px; cursor: pointer; font-family: Inter, sans-serif; font-size: 32px; font-weight: bold; margin-top: 20px; box-shadow: 4px 4px 8px rgba(0,0,0,0.2);">Add to Cart</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to modal buttons
    const closeBtn = modal.querySelector('#close-product-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', window.closeProductDetails);
    }
    
    const addBtn = modal.querySelector('#add-to-cart-from-modal');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const productId = addBtn.getAttribute('data-product-id');
            if (productId) {
                if (window.addToCart && typeof window.addToCart === 'function') {
                    window.addToCart(productId);
                } else if (typeof addToCart === 'function') {
                    addToCart(productId);
                }
                window.closeProductDetails();
            }
        });
    }
    
    modal.style.display = 'flex';
    console.log('Modal displayed');
};

window.closeProductDetails = function closeProductDetails() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) {
        modal.style.display = 'none';
        console.log('Modal closed');
    }
};

// closeProductDetails is now defined as window.closeProductDetails above

// Sample products for testing - shared constant (make it globally accessible)
// Use backend-compatible product IDs (ITEM001, ITEM002, etc.)
// Only update if not already set (inline script may have set it)
if (!window.SAMPLE_PRODUCTS || window.SAMPLE_PRODUCTS.length === 0) {
    window.SAMPLE_PRODUCTS = [
        { id: 'ITEM001', name: 'Laptop Pro 15', description: 'High-performance laptop with 16GB RAM and SSD', price: 999.99 },
        { id: 'ITEM002', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with long battery life', price: 29.99 },
        { id: 'ITEM003', name: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with blue switches', price: 79.99 },
        { id: 'ITEM004', name: '4K Monitor', description: 'Ultra sharp IPS panel with 95% DCI-P3 coverage', price: 299.99 },
        { id: 'ITEM005', name: 'USB-C Hub', description: '7-in-1 USB-C hub with HDMI and SD card reader', price: 49.99 },
        { id: 'ITEM006', name: 'Monitor Stand', description: 'Adjustable monitor stand with cable management', price: 39.99 },
        { id: 'ITEM007', name: 'Webcam HD', description: '1080p HD webcam with built-in microphone', price: 79.99 },
        { id: 'ITEM008', name: 'Laptop Stand', description: 'Aluminum laptop stand for better ergonomics', price: 59.99 },
        { id: 'ITEM009', name: 'USB-C Cable', description: '6ft USB-C to USB-C charging cable', price: 19.99 },
        { id: 'ITEM010', name: 'Gaming Headset', description: 'Wireless gaming headset with surround sound', price: 149.99 },
        { id: 'ITEM011', name: 'External Hard Drive', description: '2TB portable external hard drive', price: 89.99 },
        { id: 'ITEM012', name: 'Wireless Charger', description: 'Fast wireless charging pad for phones', price: 34.99 },
        { id: 'ITEM013', name: 'Laptop Sleeve', description: 'Protective laptop sleeve with padding', price: 24.99 },
        { id: 'ITEM014', name: 'HDMI Cable', description: '10ft high-speed HDMI 2.0 cable', price: 14.99 },
        { id: 'ITEM015', name: 'Mouse Pad', description: 'Large gaming mouse pad with RGB lighting', price: 29.99 }
    ];
}

async function loadCatalog() {
    const catalogList = document.getElementById('catalog-list');
    const startSearchText = document.getElementById('start-search-text');
    if (!catalogList) return;
    
    const searchInput = document.getElementById('catalog-search');
    const hasSearchQuery = searchInput && searchInput.value.trim();
    
    // If there's a search query, don't load catalog - let search handle it
    if (hasSearchQuery) {
        return;
    }
    
    // Show "Start Your Search" text when loading catalog (no search query)
    if (startSearchText) {
        startSearchText.style.setProperty('display', 'block', 'important');
        startSearchText.style.setProperty('visibility', 'visible', 'important');
        startSearchText.style.setProperty('opacity', '1', 'important');
        startSearchText.classList.remove('hidden');
    }
    
    // Clear any existing results - don't show items by default
    if (catalogList) {
        catalogList.innerHTML = '';
    }
    
    // Don't load items automatically - only show "Start Your Search" text
    // Items will only appear when user searches
}

async function loadCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        // If not logged in, show empty cart message
        renderCart([], 0);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            renderCart(data.cart || [], data.total || 0);
        } else {
            // If backend fails, try to show sample items for testing
            console.log('Cart fetch failed, showing empty cart');
            renderCart([], 0);
        }
    } catch (error) {
        console.error('Cart error:', error);
        // On error, show empty cart
        renderCart([], 0);
    }
}

function renderCart(cart, total) {
    const cartList = document.getElementById('cart-list');
    const totalEl = document.getElementById('cart-total');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    
    // Calculate subtotal from cart items
    let subtotal = 0;
    if (cart && cart.length > 0) {
        subtotal = cart.reduce((sum, item) => {
            const itemPrice = item.price || 0;
            const quantity = item.quantity || 1;
            return sum + (itemPrice * quantity);
        }, 0);
    }
    
    // Shipping is $5.00 only if there are items in cart, otherwise $0.00
    const shipping = (cart && cart.length > 0 && subtotal > 0) ? 5.00 : 0.00;
    // Total should be subtotal + shipping
    const calculatedTotal = subtotal + shipping;
    
    if (cartList) {
        if (!cart || cart.length === 0) {
            cartList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">Your cart is empty</p>';
        } else {
            // Match Figma design: items with image, name, description, price, and Remove button
            cartList.innerHTML = cart.map((item, index) => {
                const itemClasses = ['v1_78', 'v1_87', 'v1_96'];
                const itemClass = itemClasses[index % itemClasses.length];
                const itemPrice = item.price || 0;
                const quantity = item.quantity || 1;
                const itemTotal = itemPrice * quantity;
                return `
                    <div class="${itemClass}" style="position: relative; width: 913px; height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px;">
                        <div style="width: 150px; height: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">Image</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1);">${item.name || 'Item One'}</h4>
                            <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">${item.description || 'Item description.'}</p>
                            <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">$${itemTotal.toFixed(2)}</p>
                        </div>
                        <button onclick="if(window.removeFromCart) window.removeFromCart('${String(item.productId).replace(/'/g, "\\'")}')" style="width: 186px; height: 100px; background: rgba(217,217,217,1); color: rgba(0,0,0,1); border: none; border-radius: 20px; cursor: pointer; font-family: Inter, sans-serif; font-size: 32px; margin-left: 20px;">Remove</button>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Use calculated values - if cart is empty, always use 0
    const finalSubtotal = (!cart || cart.length === 0) ? 0 : subtotal;
    const finalTotal = (!cart || cart.length === 0) ? 0 : calculatedTotal;
    
    if (subtotalEl) subtotalEl.textContent = finalSubtotal.toFixed(2);
    if (totalEl) totalEl.textContent = finalTotal.toFixed(2);
    if (shippingEl) shippingEl.textContent = shipping.toFixed(2);
}

async function loadHistory() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // When loading history, hide thank you message and show history
    const thankYouText = document.querySelector('#history-view .v1_187');
    if (thankYouText) {
        thankYouText.style.display = 'none';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            renderHistory(data.history || []);
        }
    } catch (error) {
        console.error('History error:', error);
    }
}

function renderHistory(history) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    // Show the history list and "Order History" text (they might have been hidden on thank you page)
    historyList.style.display = 'block';
    const orderHistoryText = document.querySelector('#history-view .v1_179');
    const orderHistoryButton = document.getElementById('order-history-button');
    const historyView = document.getElementById('history-view');
    
    if (orderHistoryText) {
        orderHistoryText.style.display = 'block';
    }
    // Hide Order History button when showing actual history
    if (orderHistoryButton) {
        orderHistoryButton.style.display = 'none';
    }
    // Add class to indicate we're showing history
    if (historyView) {
        historyView.classList.add('showing-history');
    }
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">No purchase history</p>';
        return;
    }
    
    // Match Figma design: "Past Orders" with items showing image, name, description, price, date, and "Buy it Again" button
    historyList.innerHTML = history.flatMap(order => {
        const items = order.items || [];
        if (items.length === 0) {
            // If no items, show order summary
            const date = order.purchasedAt ? new Date(order.purchasedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : 'Unknown date';
            return [`
                <div class="v1_200" style="position: relative; width: 100%; min-height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px; overflow: visible;">
                    <div style="width: 150px; height: 150px; min-width: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; flex-shrink: 0;">Image</div>
                    <div style="flex: 1; min-width: 0; overflow: visible;">
                        <h4 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1); word-wrap: break-word; overflow-wrap: break-word;">Order ${order.orderId || 'Item One'}</h4>
                        <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; word-wrap: break-word; overflow-wrap: break-word;">Item description.</p>
                        <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; white-space: nowrap;">$${(order.total || 0).toFixed(2)}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; white-space: nowrap;">${date}</p>
                    </div>
                </div>
            `];
        }
        // Render each item in the order
        return items.map((item, itemIndex) => {
            const date = order.purchasedAt ? new Date(order.purchasedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : 'Unknown date';
            const itemClasses = ['v1_200', 'v1_210', 'v1_220'];
            const itemClass = itemClasses[itemIndex % itemClasses.length];
            return `
                <div class="${itemClass}" style="position: relative; width: 100%; min-height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px; overflow: visible;">
                    <div style="width: 150px; height: 150px; min-width: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; flex-shrink: 0;">Image</div>
                    <div style="flex: 1; min-width: 0; overflow: visible;">
                        <h4 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1); word-wrap: break-word; overflow-wrap: break-word;">${item.name || 'Item One'}</h4>
                        <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; word-wrap: break-word; overflow-wrap: break-word;">${item.description || 'Item description.'}</p>
                        <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; white-space: nowrap;">$${(item.subtotal || item.price * item.quantity || 0).toFixed(2)}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px; white-space: nowrap;">${date}</p>
                    </div>
                </div>
            `;
        });
    }).join('');
}

async function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please log in to add items to cart', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        const data = await response.json();
        if (data.success) {
            showMessage('Item added to cart', 'success');
            // Navigate to cart view first, then load cart
            showView('cart-view');
            // Small delay to ensure view is visible before rendering
            setTimeout(() => {
                loadCart();
            }, 100);
        } else {
            showMessage(data.message || 'Failed to add item', 'error');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showMessage('Failed to add item', 'error');
    }
}

async function removeFromCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            showMessage('Item removed', 'success');
            loadCart();
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
    }
}

async function handleCheckout() {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please log in to checkout', 'error');
        return;
    }
    
    const cardNumber = document.getElementById('card-number').value.trim();
    const cardExpiry = document.getElementById('card-expiry').value.trim();
    const cardCvv = document.getElementById('card-cvv').value.trim();
    const cardName = document.getElementById('card-name').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    
    // Validate all fields are filled
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !address) {
        showMessage('Please fill in all payment fields', 'error');
        return;
    }
    
    // Validate card number: must be 16 digits (remove spaces first)
    const cardNumberDigits = cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cardNumberDigits)) {
        showMessage('Card number must be exactly 16 digits', 'error');
        return;
    }
    
    // Validate expiration date: must be in MM/YY format and not expired
    const expiryMatch = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) {
        showMessage('Expiration date must be in MM/YY format (e.g., 12/25)', 'error');
        return;
    }
    
    const month = parseInt(expiryMatch[1], 10);
    const year = parseInt(expiryMatch[2], 10);
    
    if (month < 1 || month > 12) {
        showMessage('Invalid month. Month must be between 01 and 12', 'error');
        return;
    }
    
    // Check if card is expired
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        showMessage('Card has expired. Please use a valid expiration date', 'error');
        return;
    }
    
    // Validate CVV: must be 3 or 4 digits
    if (!/^\d{3,4}$/.test(cardCvv)) {
        showMessage('Security code must be 3 or 4 digits', 'error');
        return;
    }
    
    // Validate cardholder name: must not be empty and should contain at least letters
    if (cardName.length < 2 || !/^[a-zA-Z\s'-]+$/.test(cardName)) {
        showMessage('Cardholder name must contain at least 2 letters', 'error');
        return;
    }
    
    // Validate address: must not be empty
    if (address.length < 5) {
        showMessage('Please enter a valid shipping address', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                shippingAddress: {
                    fullName: cardName,
                    line1: address,
                    city: '',
                    state: '',
                    postalCode: '',
                    country: ''
                },
                paymentMethod: {
                    cardholderName: cardName,
                    cardNumber: cardNumberDigits,
                    cardExpiry: cardExpiry,
                    cardCvv: cardCvv,
                    billingZip: ''
                }
            })
        });
        const data = await response.json();
        if (data.success) {
            showMessage('Checkout successful!', 'success');
            loadCart();
            // Don't load history - we want to show thank you page without order history
            // Show confirmation screen (history view with "Confirmed. Thank you!" message)
            setTimeout(() => {
                showView('history-view');
                // Hide the history list and "Order History" text on thank you page
                const historyList = document.getElementById('history-list');
                const orderHistoryText = document.querySelector('#history-view .v1_179');
                const orderHistoryButton = document.getElementById('order-history-button');
                const historyView = document.getElementById('history-view');
                
                if (historyList) {
                    historyList.style.display = 'none';
                }
                if (orderHistoryText) {
                    orderHistoryText.style.display = 'none';
                }
                // Show Order History button on thank you page
                if (orderHistoryButton) {
                    orderHistoryButton.style.display = 'flex';
                }
                // Remove showing-history class to indicate we're on thank you page
                if (historyView) {
                    historyView.classList.remove('showing-history');
                }
            }, 500);
        } else {
            showMessage(data.message || 'Checkout failed', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showMessage('Checkout failed', 'error');
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    updateLoginStatus();
    
    // Only redirect if we're not already on a different view
    // This prevents redirecting away from store-view if user just logged in
    const currentView = document.querySelector('.view-screen.active');
    const currentViewId = currentView ? currentView.id : null;
    
    if (token && userStr) {
        // If already on store-view or another view, don't change it
        if (!currentViewId || currentViewId === 'welcome-view') {
            showView('store-view');
            initializeStore();
        }
    } else {
        // Only show welcome if we're not already on a different view
        if (!currentViewId || currentViewId === 'welcome-view') {
            showView('welcome-view');
        }
    }
});

function addNavigationButtons() {
    // Add navigation to store view header
    const storeView = document.getElementById('store-view');
    if (storeView) {
        const header = storeView.querySelector('.v1_51');
        if (header && !header.querySelector('.nav-buttons')) {
            const navDiv = document.createElement('div');
            navDiv.className = 'nav-buttons';
            navDiv.style.cssText = 'position: absolute; top: 200px; right: 40px; z-index: 1000;';
            navDiv.innerHTML = `
                <button onclick="showView('cart-view'); loadCart();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">Cart</button>
                <button onclick="showView('history-view'); loadHistory();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">History</button>
            `;
            header.appendChild(navDiv);
        }
    }
    
    // Add navigation to cart view
    const cartView = document.getElementById('cart-view');
    if (cartView) {
        const header = cartView.querySelector('.v1_67');
        if (header && !header.querySelector('.nav-buttons')) {
            const navDiv = document.createElement('div');
            navDiv.className = 'nav-buttons';
            navDiv.style.cssText = 'position: absolute; top: 200px; right: 40px; z-index: 1000;';
            navDiv.innerHTML = `
                <button onclick="showView('store-view'); loadCatalog();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">Store</button>
                <button onclick="showView('history-view'); loadHistory();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">History</button>
            `;
            header.appendChild(navDiv);
        }
    }
    
    // Add navigation to history view
    const historyView = document.getElementById('history-view');
    if (historyView) {
        const header = historyView.querySelector('.v1_175');
        if (header && !header.querySelector('.nav-buttons')) {
            const navDiv = document.createElement('div');
            navDiv.className = 'nav-buttons';
            navDiv.style.cssText = 'position: absolute; top: 200px; right: 40px; z-index: 1000;';
            navDiv.innerHTML = `
                <button onclick="showView('store-view'); loadCatalog();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">Store</button>
                <button onclick="showView('cart-view'); loadCart();" style="margin: 5px; padding: 10px 20px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 5px; cursor: pointer;">Cart</button>
            `;
            header.appendChild(navDiv);
        }
    }
}

function buyAgain(productId) {
    console.log('buyAgain called with productId:', productId);
    if (!productId) {
        console.error('No productId provided to buyAgain');
        showMessage('Error: Product ID missing', 'error');
        return;
    }
    // Add item from history back to cart
    addToCart(productId);
    // Navigate to cart view
    setTimeout(() => {
        showView('cart-view');
        loadCart();
        showMessage('Item added to cart', 'success');
    }, 100);
}

// Function to show order history from thank you page
window.showOrderHistory = function showOrderHistory() {
    const historyView = document.getElementById('history-view');
    const orderHistoryButton = document.getElementById('order-history-button');
    const orderHistoryText = document.querySelector('#history-view .v1_179');
    
    // Hide the thank you message
    const thankYouText = document.querySelector('#history-view .v1_187');
    if (thankYouText) {
        thankYouText.style.display = 'none';
    }
    
    // Hide the Order History button
    if (orderHistoryButton) {
        orderHistoryButton.style.display = 'none';
    }
    
    // Show Order History text
    if (orderHistoryText) {
        orderHistoryText.style.display = 'block';
    }
    
    // Load and show order history
    loadHistory();
    
    // Add class to indicate we're showing history
    if (historyView) {
        historyView.classList.add('showing-history');
    }
};

// Make functions available globally (showView is already assigned to window above)
window.showLoginForm = showLoginForm;
// Use module's logout (it has updateLoginStatus which is important)
window.logout = logout;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.buyAgain = buyAgain;
window.loadCart = loadCart;
window.loadCatalog = loadCatalog;

// Set up buy button handler on page load (event delegation)
// This ensures buy buttons work everywhere, even if created dynamically
function setupBuyButtonHandler() {
    const catalogList = document.getElementById('catalog-list');
    if (catalogList) {
        // Remove existing handlers (both capture and bubble phases)
        catalogList.removeEventListener('click', handleBuyButtonClick, true);
        catalogList.removeEventListener('click', handleBuyButtonClick, false);
        // Add handler using capture phase for better reliability (fires before bubble)
        catalogList.addEventListener('click', handleBuyButtonClick, true);
    }
}

// Set up immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupBuyButtonHandler);
} else {
    setupBuyButtonHandler();
}

window.loadHistory = loadHistory;
window.updateLoginStatus = updateLoginStatus;
// Always use the module version - it has proper race condition handling
window.performSearch = performSearch;
// showOrderHistory is already defined as window.showOrderHistory above
// showProductDetails and closeProductDetails are already defined as window properties above

