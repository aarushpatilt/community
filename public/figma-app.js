/**
 * Figma App - Complete Integration
 * Connects Figma design with backend functionality
 */

import { createStoreUI } from './store.js';

const API_BASE_URL = 'http://localhost:3000/api';

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================

function showView(viewId) {
    document.querySelectorAll('.view-screen').forEach(view => {
        view.classList.remove('active');
    });
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
        // Scroll to top when switching views
        window.scrollTo(0, 0);
    }
}

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
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage('Please enter username and password', 'error');
        return;
    }
    
    (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            const isSuccess = result.success === true || result.success === "true";
            
            if (!isSuccess) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                updateLoginStatus();
                showMessage(result.message || 'Login failed', 'error');
                return;
            }
            
            if (result.token && result.user) {
                persistSession(result.token, result.user);
                updateLoginStatus();
                showMessage('Login successful!', 'success');
                setTimeout(() => {
                    showView('store-view');
                    initializeStore();
                }, 500);
            } else {
                showMessage('Login failed - missing token', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Network error. Please check the server.', 'error');
        }
    })();
}

// Attach login handler to form (works for both welcome and any login views)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Signup form handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;
        
        if (password !== passwordConfirm) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
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
    });
}

// ============================================================================
// STORE FUNCTIONALITY
// ============================================================================

// Helper function to perform search - make it globally accessible
window.performSearch = function performSearch(query) {
    console.log('performSearch called with query:', query);
    const catalogList = document.getElementById('catalog-list');
    const startSearchText = document.getElementById('start-search-text');
    
    if (!query || !query.trim()) {
        console.log('Empty query, loading catalog');
        if (startSearchText) startSearchText.style.display = 'block';
        loadCatalog();
        return;
    }
    
    // Hide "Start Your Search" text when searching - do this immediately and forcefully
    if (startSearchText) {
        startSearchText.style.setProperty('display', 'none', 'important');
        startSearchText.style.setProperty('visibility', 'hidden', 'important');
        startSearchText.style.setProperty('opacity', '0', 'important');
        startSearchText.classList.add('hidden');
        console.log('Hiding start search text');
    }
    
    // Get SAMPLE_PRODUCTS - make sure it's available
    const sampleProducts = window.SAMPLE_PRODUCTS || (typeof SAMPLE_PRODUCTS !== 'undefined' ? SAMPLE_PRODUCTS : []);
    
    if (!sampleProducts || sampleProducts.length === 0) {
        console.error('SAMPLE_PRODUCTS not available');
        if (catalogList) {
            catalogList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; text-align: center; margin-top: 100px;">Search unavailable - products not loaded</p>';
        }
        return;
    }
    
    // Use sample products filtered by query (immediate, no API call needed)
    const queryLower = query.toLowerCase();
    const results = sampleProducts.filter(p => {
        if (!p) return false;
        const nameMatch = p.name && p.name.toLowerCase().includes(queryLower);
        const descMatch = p.description && p.description.toLowerCase().includes(queryLower);
        return nameMatch || descMatch;
    });
    
    console.log('Filtered results:', results.length, results);
    
    // Ensure "Start Your Search" text is hidden (double-check)
    if (startSearchText) {
        startSearchText.style.setProperty('display', 'none', 'important');
        startSearchText.style.setProperty('visibility', 'hidden', 'important');
        startSearchText.style.setProperty('opacity', '0', 'important');
        startSearchText.classList.add('hidden');
    }
    
    if (results.length > 0) {
        renderSearchResults(results);
        // Update search results title
        if (catalogList) {
            // Remove existing title if any
            const existingTitle = catalogList.previousElementSibling;
            if (existingTitle && existingTitle.textContent && existingTitle.textContent.includes('Search Results')) {
                existingTitle.remove();
            }
            const title = document.createElement('p');
            title.style.cssText = 'position: absolute; top: 300px; left: 50%; transform: translateX(-50%); width: 935px; color: rgba(22,79,27,1); font-family: Inria Serif, serif; font-size: 64px; text-align: center; margin: 0 0 20px 0; z-index: 10;';
            title.textContent = 'Search Results';
            catalogList.parentElement.insertBefore(title, catalogList);
        }
    } else {
        console.log('No results found');
        if (catalogList) {
            catalogList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; text-align: center; margin-top: 100px;">No results found</p>';
        }
        // "Start Your Search" text is already hidden above
    }
    
    // Also try API search in background (optional)
    (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.results && data.results.length > 0) {
                console.log('API returned results:', data.results.length);
                renderSearchResults(data.results);
            }
        } catch (error) {
            console.error('API search error (using sample products):', error);
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
    function setupSearchHandlers() {
        const form = document.getElementById('search-form');
        const input = document.getElementById('catalog-search');
        const startText = document.getElementById('start-search-text');
        const searchButton = document.querySelector('#store-view .v1_64');
        
        console.log('Setting up search handlers:', { form: !!form, input: !!input, searchButton: !!searchButton, performSearch: typeof performSearch });
        
        if (form && input) {
            // Remove any existing listeners by cloning
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            const newInput = document.getElementById('catalog-search');
            
            // Form submit handler - add both inline and event listener
            const formRef = document.getElementById('search-form');
            if (formRef) {
                formRef.addEventListener('submit', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const query = newInput ? newInput.value.trim() : '';
                    console.log('Form submit handler - query:', query);
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
                });
            }
            
            // Real-time search as user types
            if (newInput) {
                let searchTimeout;
                newInput.addEventListener('input', () => {
                    const query = newInput.value.trim();
                    console.log('Input event - query:', query);
                    
                    // Clear previous timeout
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
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
                    }, 300);
                });
            }
        }
        
        // Search button click handler - override inline onclick
        if (searchButton) {
            // Remove existing onclick
            searchButton.removeAttribute('onclick');
            searchButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const input = document.getElementById('catalog-search');
                const query = input ? input.value.trim() : '';
                console.log('Search button clicked - query:', query);
                if (query) {
                    const startText = document.getElementById('start-search-text');
                    if (startText) startText.style.display = 'none';
                    if (typeof performSearch === 'function') {
                        performSearch(query);
                    } else {
                        console.error('performSearch function not available');
                    }
                } else {
                    const startText = document.getElementById('start-search-text');
                    if (startText) startText.style.display = 'block';
                    loadCatalog();
                }
                return false;
            });
        }
    }
    
    // Set up search handlers - try multiple times to ensure DOM is ready
    setupSearchHandlers();
    setTimeout(setupSearchHandlers, 100);
    setTimeout(setupSearchHandlers, 500);
    
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
    
    if (!results || results.length === 0) {
        catalogList.innerHTML = '<p style="color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px; text-align: center; margin-top: 100px;">No results found</p>';
        return;
    }
    
    // Match Figma design: items with image placeholder, "Search Result" text, description, price, and "Buy" button
    catalogList.innerHTML = results.map((item, index) => `
        <div class="v1_${150 + index * 8}" style="position: relative; width: 100%; height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px; cursor: pointer;" data-product-id="${item.id}">
            <div style="width: 150px; height: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif;">Image</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1);">${item.name || 'Search Result'}</h3>
                <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">${item.description || 'Item description.'}</p>
                <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">$${item.price ? item.price.toFixed(2) : 'Price'}</p>
            </div>
            <button onclick="event.stopPropagation(); addToCart('${item.id}')" style="width: 133px; height: 100px; background: rgba(22,79,27,1); color: white; border: none; border-radius: 20px; cursor: pointer; font-family: Inter, sans-serif; font-size: 32px; margin-left: 20px;">Buy</button>
        </div>
    `).join('');
    
    // Use event delegation on the catalog list for better reliability
    // Remove any existing listener first
    catalogList.removeEventListener('click', handleProductClick);
    catalogList.addEventListener('click', handleProductClick);
}

// Event handler for product item clicks (event delegation)
function handleProductClick(e) {
    // Find the product item div (closest element with data-product-id)
    const productItem = e.target.closest('[data-product-id]');
    if (!productItem) return;
    
    // Don't trigger if clicking the Buy button
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
    }
    
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
                addToCart(productId);
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
window.SAMPLE_PRODUCTS = [
    { id: '1', name: 'Laptop Pro 15', description: 'High-performance laptop with 16GB RAM and SSD', price: 1299.99 },
    { id: '2', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with long battery life', price: 29.99 },
    { id: '3', name: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with blue switches', price: 89.99 },
    { id: '4', name: 'USB-C Hub', description: '7-in-1 USB-C hub with HDMI and SD card reader', price: 49.99 },
    { id: '5', name: 'Monitor Stand', description: 'Adjustable monitor stand with cable management', price: 39.99 },
    { id: '6', name: 'Webcam HD', description: '1080p HD webcam with built-in microphone', price: 79.99 },
    { id: '7', name: 'Laptop Stand', description: 'Aluminum laptop stand for better ergonomics', price: 59.99 },
    { id: '8', name: 'USB-C Cable', description: '6ft USB-C to USB-C charging cable', price: 19.99 },
    { id: '9', name: 'Gaming Headset', description: 'Wireless gaming headset with surround sound', price: 149.99 },
    { id: '10', name: 'External Hard Drive', description: '2TB portable external hard drive', price: 89.99 },
    { id: '11', name: 'Wireless Charger', description: 'Fast wireless charging pad for phones', price: 34.99 },
    { id: '12', name: 'Laptop Sleeve', description: 'Protective laptop sleeve with padding', price: 24.99 },
    { id: '13', name: 'HDMI Cable', description: '10ft high-speed HDMI 2.0 cable', price: 14.99 },
    { id: '14', name: 'Desk Lamp', description: 'LED desk lamp with adjustable brightness', price: 44.99 },
    { id: '15', name: 'Mouse Pad', description: 'Large gaming mouse pad with RGB lighting', price: 29.99 }
];

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
                        <button onclick="removeFromCart('${item.productId}')" style="width: 186px; height: 100px; background: rgba(217,217,217,1); color: rgba(0,0,0,1); border: none; border-radius: 20px; cursor: pointer; font-family: Inter, sans-serif; font-size: 32px; margin-left: 20px;">Remove</button>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Use calculated values or fall back to backend values
    const finalSubtotal = subtotal > 0 ? subtotal : (total ? total - shipping : 0);
    const finalTotal = calculatedTotal > 0 ? calculatedTotal : (total || 0);
    
    if (subtotalEl) subtotalEl.textContent = finalSubtotal.toFixed(2);
    if (totalEl) totalEl.textContent = finalTotal.toFixed(2);
    if (shippingEl) shippingEl.textContent = shipping.toFixed(2);
}

async function loadHistory() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
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
                <div class="v1_200" style="position: relative; width: 100%; height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px;">
                    <div style="width: 150px; height: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">Image</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1);">Order ${order.orderId || 'Item One'}</h4>
                        <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">Item description.</p>
                        <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">$${(order.total || 0).toFixed(2)}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">${date}</p>
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
                <div class="${itemClass}" style="position: relative; width: 100%; height: 150px; margin-bottom: 20px; background: rgba(255,255,255,0.9); border-radius: 10px; display: flex; align-items: center; padding: 20px;">
                    <div style="width: 150px; height: 150px; background: rgba(217,217,217,1); border-radius: 5px; margin-right: 20px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">Image</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 10px 0; font-family: Inter, sans-serif; font-size: 32px; color: rgba(0,0,0,1);">${item.name || 'Item One'}</h4>
                        <p style="margin: 0 0 10px 0; color: rgba(0,0,0,0.5); font-family: Inter, sans-serif; font-size: 32px;">${item.description || 'Item description.'}</p>
                        <p style="margin: 0; font-weight: bold; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">$${(item.subtotal || item.price * item.quantity || 0).toFixed(2)}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(0,0,0,1); font-family: Inter, sans-serif; font-size: 32px;">${date}</p>
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
            loadCart();
            showView('cart-view');
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
    
    const cardNumber = document.getElementById('card-number').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;
    const cardName = document.getElementById('card-name').value;
    const address = document.getElementById('ship-address').value;
    
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !address) {
        showMessage('Please fill in all payment fields', 'error');
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
                    cardNumber: cardNumber.replace(/\s+/g, ''),
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
            loadHistory();
            // Show confirmation screen (history view with "Confirmed. Thank you!" message)
            setTimeout(() => {
                showView('history-view');
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
    if (token && userStr) {
        showView('store-view');
        initializeStore();
    } else {
        // Show welcome page first (not login)
        showView('welcome-view');
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

// Make functions available globally
window.showView = showView;
window.showLoginForm = showLoginForm;
window.logout = logout;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.buyAgain = buyAgain;
window.loadCart = loadCart;
window.loadCatalog = loadCatalog;
window.loadHistory = loadHistory;
window.updateLoginStatus = updateLoginStatus;
window.performSearch = window.performSearch || performSearch; // Ensure it's available globally
// showProductDetails and closeProductDetails are already defined as window properties above

