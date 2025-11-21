/**
 * ============================================================================
 * FRONTEND: STORE UI MODULE
 * ============================================================================
 * 
 * This module creates the store UI component that handles:
 * - Product catalog display
 * - Shopping cart management
 * - Purchase history display
 * - Checkout process
 * 
 * CONNECTION TO BACKEND:
 * - All API calls go to http://localhost:3000/api/* (configured in store-page.js)
 * - Uses fetch() API to make HTTP requests
 * - Sends JWT token in Authorization header for authenticated requests
 * - Receives JSON responses from backend
 * 
 * WHY THIS ARCHITECTURE:
 * - Separates UI logic from API communication
 * - Reusable component that can be configured with different API endpoints
 * - Handles authentication token management
 * - Provides error handling and user feedback
 */

// Helper function to get DOM elements by ID
const el = id => document.getElementById(id);

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================
// These are references to HTML elements that will be manipulated
const refs = {
  panel: el('store-panel'),           // Main store panel container
  catalog: el('catalog-list'),          // Where products are displayed
  cart: el('cart-list'),               // Where cart items are displayed
  history: el('history-list'),         // Where purchase history is displayed
  total: el('cart-total'),             // Cart total price display
  message: el('store-message'),        // Message display area
  checkout: el('checkout-btn'),        // Checkout button
  refresh: el('refresh-store'),        // Refresh button
  clear: el('clear-cart'),             // Clear cart button
  searchForm: el('search-form'),       // Search form
  searchInput: el('catalog-search'),   // Search input field
  clearSearch: el('clear-search'),     // Clear search button
  checkoutDetails: el('checkout-details') // Checkout form
};

// Shipping address input fields
const shippingInputs = {
  fullName: el('ship-name'),
  line1: el('ship-line1'),
  line2: el('ship-line2'),
  city: el('ship-city'),
  state: el('ship-state'),
  postalCode: el('ship-postal'),
  country: el('ship-country')
};

// Payment method input fields
const paymentInputs = {
  cardholderName: el('card-name'),
  cardNumber: el('card-number'),
  cardExpiry: el('card-expiry'),
  cardCvv: el('card-cvv'),
  billingZip: el('billing-zip')
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
// Local state to track catalog and search results
const state = {
  catalog: [],           // Full product catalog from backend
  query: '',            // Current search query
  searchResults: null   // Filtered search results (null = show all)
};

// Helper to format numbers as currency
const formatCurrency = value => `$${Number(value || 0).toFixed(2)}`;

// ============================================================================
// MAIN EXPORT: createStoreUI FUNCTION
// ============================================================================
/**
 * Creates and returns a store UI component
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.apiBaseUrl - Base URL for API calls (e.g., 'http://localhost:3000/api')
 * @param {Function} config.getToken - Function that returns JWT token from storage
 * @param {Function} config.onSessionExpired - Callback when authentication fails
 * 
 * WHY: This factory function allows the store UI to be configured with different
 * API endpoints and token management strategies. The token is passed in as a function
 * so it can be retrieved fresh on each request (in case it was updated).
 */
export function createStoreUI({ apiBaseUrl, getToken, onSessionExpired }) {
  
  // ========================================================================
  // UI HELPER FUNCTIONS
  // ========================================================================
  
  /**
   * setMessage - Display success/error messages to user
   * WHY: Provides user feedback for actions (add to cart, checkout, etc.)
   */
  const setMessage = (message = '', type = '') => {
    if (!refs.message) return;
    refs.message.textContent = message;
    refs.message.className = `message ${type}`.trim();
    refs.message.style.display = message ? 'block' : 'none';
  };

  /**
   * resetPanel - Reset all UI elements to initial state
   * WHY: Clears the store UI when hiding the panel
   */
  const resetPanel = () => {
    refs.catalog.innerHTML = '';
    refs.cart.innerHTML = '';
    refs.history.innerHTML = '';
    refs.total.textContent = formatCurrency(0);
    refs.checkout.disabled = true;
    state.catalog = [];
    state.query = '';
    state.searchResults = null;
    refs.searchInput.value = '';
    refs.checkoutDetails?.reset?.();
    Object.values(shippingInputs).forEach(input => { if (input) input.value = ''; });
    Object.values(paymentInputs).forEach(input => { if (input) input.value = ''; });
    setMessage('');
  };

  // ========================================================================
  // API COMMUNICATION FUNCTIONS
  // ========================================================================
  
  /**
   * authFetch - Wrapper around fetch() that adds authentication
   * 
   * HOW IT CONNECTS TO BACKEND:
   * 1. Gets JWT token from getToken() function (provided by store-page.js)
   * 2. Adds Authorization header: "Bearer <token>"
   * 3. Makes fetch request to apiBaseUrl + endpoint
   * 4. Checks response status - if 401/403, calls onSessionExpired callback
   * 5. Returns response for further processing
   * 
   * WHY: Centralizes authentication logic so all API calls automatically
   * include the token. The backend's authenticateToken middleware expects
   * this header format.
   * 
   * @param {string} endpoint - API endpoint (e.g., '/cart', '/cart/checkout')
   * @param {Object} options - Fetch options (method, body, etc.)
   * @returns {Promise<Response>} - Fetch response object
   */
  const authFetch = (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken?.(); // Get token from localStorage (via store-page.js)
    
    // Add Authorization header if token exists
    // Backend expects: "Authorization: Bearer <token>"
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Make request to backend API
    // apiBaseUrl is 'http://localhost:3000/api' (from store-page.js)
    // endpoint is like '/cart' or '/cart/checkout'
    // Full URL: http://localhost:3000/api/cart
    return fetch(`${apiBaseUrl}${endpoint}`, { ...options, headers }).then(response => {
      // If authentication failed, trigger session expired callback
      // This redirects user to login page
      if (response.status === 401 || response.status === 403) {
        onSessionExpired?.();
      }
      return response;
    });
  };

  /**
   * fetchCatalog - Fetches product catalog from backend
   * 
   * CONNECTION TO BACKEND:
   * - GET request to /api/catalog
   * - No authentication required (public endpoint)
   * - Backend returns: { success: true, items: [...] }
   * 
   * WHY: Loads products to display in the catalog section
   */
  const fetchCatalog = async () => {
    try {
      // Public endpoint - no authentication needed
      const response = await fetch(`${apiBaseUrl}/catalog`);
      const data = await response.json();
      if (data.success) {
        state.catalog = data.items; // Store in local state
        renderCatalog(); // Update UI
      } else {
        setMessage('Unable to load catalog.', 'error');
      }
    } catch (error) {
      console.error('Catalog error:', error);
      setMessage('Failed to fetch catalog.', 'error');
    }
  };

  /**
   * loadCart - Fetches user's cart from backend
   * 
   * CONNECTION TO BACKEND:
   * - GET request to /api/cart
   * - Requires authentication (uses authFetch)
   * - Backend returns: { success: true, cart: [...], total: 123.45 }
   * 
   * WHY: Loads user's current cart when page loads or after cart operations
   */
  const loadCart = async () => {
    try {
      // Authenticated endpoint - uses authFetch which adds token
      const response = await authFetch('/cart');
      
      // Check if response is OK
      if (!response.ok) {
        console.error('Cart fetch failed with status:', response.status);
        if (response.status === 401 || response.status === 403) {
          onSessionExpired?.();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.message || 'Failed to fetch cart.', 'error');
        return;
      }
      
      const data = await response.json();
      console.log('Cart response:', data); // Debug log
      if (data.success) {
        renderCart(data.cart || [], data.total || 0); // Update UI with cart data
      } else {
        console.error('Cart fetch failed:', data.message);
        setMessage(data.message || 'Failed to fetch cart.', 'error');
      }
    } catch (error) {
      console.error('Cart fetch error:', error);
      setMessage('Failed to fetch cart.', 'error');
    }
  };

  /**
   * loadHistory - Fetches user's purchase history from backend
   * 
   * CONNECTION TO BACKEND:
   * - GET request to /api/purchase-history
   * - Requires authentication
   * - Backend returns: { success: true, history: [...] }
   * 
   * WHY: Displays user's past orders
   */
  const loadHistory = async () => {
    try {
      const response = await authFetch('/purchase-history');
      
      // Check if response is OK
      if (!response.ok) {
        console.error('History fetch failed with status:', response.status);
        if (response.status === 401 || response.status === 403) {
          onSessionExpired?.();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.message || 'Failed to fetch purchase history.', 'error');
        return;
      }
      
      const data = await response.json();
      console.log('Purchase history response:', data); // Debug log
      if (data.success) {
        console.log('History array:', data.history); // Debug log
        renderHistory(data.history || []); // Update UI with history
      } else {
        console.error('History fetch failed:', data.message);
        setMessage(data.message || 'Failed to fetch purchase history.', 'error');
      }
    } catch (error) {
      console.error('History fetch error:', error);
      setMessage('Failed to fetch purchase history.', 'error');
    }
  };

  /**
   * refreshAll - Loads catalog, cart, and history simultaneously
   * WHY: Refreshes all data when user clicks refresh button
   */
  const refreshAll = () => Promise.all([fetchCatalog(), loadCart(), loadHistory()]);

  /**
   * clearCart - Clears user's cart via backend API
   * 
   * CONNECTION TO BACKEND:
   * - POST request to /api/cart/clear
   * - Requires authentication
   * - Backend empties cart in database
   * - Returns: { success: true, cart: [], total: 0 }
   * 
   * WHY: Allows user to quickly remove all items from cart
   */
  const clearCart = async () => {
    try {
      const response = await authFetch('/cart/clear', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        renderCart([], 0); // Update UI to show empty cart
        setMessage('Cart cleared.', 'success');
      } else {
        setMessage(data.message || 'Unable to clear cart.', 'error');
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      setMessage('Failed to clear cart.', 'error');
    }
  };

  /**
   * checkout - Processes checkout and creates order
   * 
   * CONNECTION TO BACKEND:
   * - POST request to /api/cart/checkout
   * - Requires authentication
   * - Sends: { shippingAddress: {...}, paymentMethod: {...} }
   * - Backend validates, creates order, clears cart, saves to purchaseHistory
   * - Returns: { success: true, order: {...} }
   * 
   * WHY: Completes the purchase process and saves order to database
   */
  const checkout = async () => {
    refs.checkout.disabled = true; // Prevent double-submission
    try {
      // Collect form data from checkout form
      const checkoutPayload = collectCheckoutDetails();
      if (!checkoutPayload.success) {
        setMessage(checkoutPayload.message, 'error');
        return;
      }

      // Send checkout data to backend
      // Backend will validate shipping/payment, create order, clear cart
      const response = await authFetch('/cart/checkout', {
        method: 'POST',
        body: JSON.stringify(checkoutPayload.payload) // Convert to JSON
      });
      const data = await response.json();
      if (data.success) {
        setMessage(`Checkout complete! Order ${data.order.orderId}`, 'success');
        refs.checkoutDetails?.reset?.(); // Clear form
        await loadCart(); // Refresh cart (should be empty now)
        await loadHistory(); // Refresh history (should include new order)
      } else {
        setMessage(data.message || 'Checkout failed.', 'error');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setMessage('Checkout failed.', 'error');
    } finally {
      refs.checkout.disabled = false;
    }
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  /**
   * addCatalogHandlers - Sets up all event listeners for store interactions
   * WHY: Handles user clicks and form submissions
   */
  const addCatalogHandlers = () => {
    // Button click handlers
    refs.refresh.addEventListener('click', refreshAll);
    refs.clear.addEventListener('click', clearCart);
    refs.checkout.addEventListener('click', checkout);

    /**
     * Search form submission
     * 
     * CONNECTION TO BACKEND:
     * - GET request to /api/search?q=<query>
     * - No authentication required (public endpoint)
     * - Backend searches catalog and returns matching products
     * - Returns: { success: true, query: "...", results: [...] }
     * 
     * WHY: Allows users to search for products by keyword
     */
    refs.searchForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const query = refs.searchInput.value.trim();
      if (!query) {
        setMessage('Enter a search keyword to continue.', 'error');
        return;
      }

      try {
        // Public endpoint - no auth needed
        // encodeURIComponent ensures special characters in query are properly encoded
        const response = await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success) {
          state.query = data.query;
          state.searchResults = data.results; // Store results in state
          renderCatalog(); // Display search results
          setMessage(`Showing results for "${data.query}"`, 'success');
        } else {
          setMessage(data.message || 'Unable to search right now.', 'error');
        }
      } catch (error) {
        console.error('Search error:', error);
        setMessage('Search failed. Please try again.', 'error');
      }
    });

    // Clear search button
    refs.clearSearch?.addEventListener('click', () => {
      state.query = '';
      state.searchResults = null; // Clear search results
      refs.searchInput.value = '';
      renderCatalog(); // Show full catalog again
      setMessage('Search cleared.', 'success');
    });

    /**
     * Add to cart button click handler
     * 
     * CONNECTION TO BACKEND:
     * - POST request to /api/cart
     * - Requires authentication (uses authFetch)
     * - Sends: { productId: "...", quantity: 2 }
     * - Backend adds item to user's cart in database
     * - Returns: { success: true, cart: [...], total: 123.45, message: "..." }
     * 
     * WHY: Adds selected product to user's shopping cart
     */
    refs.catalog.addEventListener('click', async event => {
      const button = event.target.closest('[data-action="add-to-cart"]');
      if (!button) return;
      const wrapper = button.closest('.catalog-item');
      const quantity = parseQuantity(wrapper.querySelector('.qty-input')?.value);

      try {
        // Send add-to-cart request to backend
        const response = await authFetch('/cart', {
          method: 'POST',
          body: JSON.stringify({ 
            productId: button.dataset.productId, // From data-product-id attribute
            quantity 
          })
        });
        const data = await response.json();
        if (data.success) {
          renderCart(data.cart, data.total); // Update cart display
          setMessage(data.message, 'success');
        } else {
          setMessage(data.message || 'Unable to add item.', 'error');
        }
      } catch (error) {
        console.error('Add to cart error:', error);
        setMessage('Failed to add item.', 'error');
      }
    });

    /**
     * Cart item actions (update quantity, remove item)
     * 
     * CONNECTION TO BACKEND:
     * - PATCH /api/cart/:productId (update quantity)
     * - DELETE /api/cart/:productId (remove item)
     * - Requires authentication
     * - Backend updates/removes item in database
     * - Returns: { success: true, cart: [...], total: 123.45 }
     * 
     * WHY: Allows users to modify items in their cart
     */
    refs.cart.addEventListener('click', async event => {
      const actionBtn = event.target.closest('[data-cart-action]');
      if (!actionBtn) return;
      const productId = actionBtn.dataset.productId;

      if (actionBtn.dataset.cartAction === 'remove') {
        // DELETE request to remove item
        await mutateCart(`/cart/${productId}`, { method: 'DELETE' }, 'Item removed.');
      } else if (actionBtn.dataset.cartAction === 'update') {
        // PATCH request to update quantity
        const wrapper = actionBtn.closest('.cart-item');
        const quantity = parseQuantity(wrapper.querySelector('.qty-input')?.value);
        await mutateCart(`/cart/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity })
        }, 'Cart updated.');
      }
    });
  };

  /**
   * mutateCart - Helper function for cart update/delete operations
   * 
   * CONNECTION TO BACKEND:
   * - Makes authenticated request to specified endpoint
   * - Updates UI with response data
   * 
   * WHY: Reduces code duplication for similar cart operations
   */
  const mutateCart = async (endpoint, options, successMessage) => {
    try {
      const response = await authFetch(endpoint, options);
      const data = await response.json();
      if (data.success) {
        renderCart(data.cart, data.total); // Update UI
        setMessage(successMessage, 'success');
      } else {
        setMessage(data.message || 'Unable to update cart.', 'error');
      }
    } catch (error) {
      console.error('Cart mutation error:', error);
      setMessage('Failed to update cart.', 'error');
    }
  };

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================
  
  /**
   * parseQuantity - Validates and normalizes quantity input
   * WHY: Ensures quantity is valid number between 1-99
   */
  const parseQuantity = value => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1; // Default to 1 if invalid
    }
    return Math.min(parsed, 99); // Cap at 99
  };

  // ========================================================================
  // RENDERING FUNCTIONS
  // ========================================================================
  
  /**
   * renderCatalog - Displays products in the catalog section
   * WHY: Updates UI to show products (either full catalog or search results)
   */
  const renderCatalog = () => {
    const list = state.searchResults ?? state.catalog; // Use search results if available

    if (!list.length) {
      if (state.searchResults) {
        refs.catalog.innerHTML = `<p class="empty-state">No results for "${state.query}".</p>`;
      } else {
        refs.catalog.innerHTML = '<p class="empty-state">No catalog items available.</p>';
      }
      return;
    }

    // Generate HTML for each product
    refs.catalog.innerHTML = list
      .map(item => `
        <article class="catalog-item">
          <div>
            <h4>${item.name}</h4>
            <p>${item.description || ''}</p>
            <strong class="price">${formatCurrency(item.price)}</strong>
          </div>
          <div class="catalog-actions">
            <label>
              Qty
              <input type="number" class="qty-input" min="1" max="99" value="1">
            </label>
            <button class="btn btn-primary slim" data-action="add-to-cart" data-product-id="${item.id}">
              Add to Cart
            </button>
          </div>
        </article>
      `)
      .join('');
  };

  /**
   * renderCart - Displays items in the cart section
   * WHY: Updates UI to show current cart contents and total
   */
  const renderCart = (cart = [], total = 0) => {
    if (!cart.length) {
      refs.cart.innerHTML = '<p class="empty-state">Your cart is empty.</p>';
      refs.checkout.disabled = true;
      refs.total.textContent = formatCurrency(0);
      return;
    }

    // Generate HTML for each cart item
    refs.cart.innerHTML = cart
      .map(item => `
        <article class="cart-item">
          <div class="cart-item-header">
            <div>
              <h4>${item.name}</h4>
              <p>${formatCurrency(item.price)} each</p>
            </div>
            <span class="badge">ID ${item.productId}</span>
          </div>
          <div class="cart-item-actions">
            <input type="number" class="qty-input" min="1" max="99" value="${item.quantity}">
            <button class="btn btn-secondary slim" data-cart-action="update" data-product-id="${item.productId}">Update</button>
            <button class="btn btn-secondary slim" data-cart-action="remove" data-product-id="${item.productId}">Remove</button>
          </div>
        </article>
      `)
      .join('');
    refs.checkout.disabled = false;
    refs.total.textContent = formatCurrency(total);
  };

  /**
   * renderHistory - Displays purchase history
   * WHY: Shows user their past orders
   */
  const renderHistory = (history = []) => {
    console.log('Rendering history:', history); // Debug log
    if (!history || !Array.isArray(history) || history.length === 0) {
      refs.history.innerHTML = '<p class="empty-state">No purchases recorded yet.</p>';
      return;
    }

    // Generate HTML for each order
    refs.history.innerHTML = history
      .map(order => {
        try {
          // Handle different timestamp formats
          let dateStr = 'Unknown date';
          if (order.purchasedAt) {
            if (typeof order.purchasedAt === 'string') {
              // Try parsing as ISO string or timestamp
              const date = new Date(order.purchasedAt);
              if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleString();
              } else {
                // Try as milliseconds timestamp
                const timestamp = parseInt(order.purchasedAt);
                if (!isNaN(timestamp)) {
                  dateStr = new Date(timestamp).toLocaleString();
                }
              }
            } else if (typeof order.purchasedAt === 'number') {
              dateStr = new Date(order.purchasedAt).toLocaleString();
            }
          }
          
          const itemsHtml = (order.items || [])
            .map(item => {
              const subtotal = item.subtotal || (item.price * item.quantity) || 0;
              return `<li>${item.quantity || 0} × ${item.name || 'Unknown'} (${formatCurrency(subtotal)})</li>`;
            })
            .join('');
          
          return `
            <article class="history-entry">
              <h4>Order ${order.orderId || 'Unknown'}</h4>
              <p>${dateStr}</p>
              <ul>
                ${itemsHtml}
              </ul>
              <strong>Total: ${formatCurrency(order.total || 0)}</strong>
            </article>
          `;
        } catch (error) {
          console.error('Error rendering order:', error, order);
          return `<article class="history-entry"><p>Error displaying order</p></article>`;
        }
      })
      .join('');
  };

  /**
   * collectCheckoutDetails - Collects and validates checkout form data
   * WHY: Prepares shipping and payment data before sending to backend
   */
  const collectCheckoutDetails = () => {
    const shippingAddress = {};
    for (const [key, input] of Object.entries(shippingInputs)) {
      const value = input?.value?.trim();
      if (!value && key !== 'line2') {
        return { success: false, message: 'Please complete the shipping form.' };
      }
      shippingAddress[key] = value || '';
    }

    const paymentMethod = {};
    for (const [key, input] of Object.entries(paymentInputs)) {
      const value = input?.value?.trim();
      if (!value) {
        return { success: false, message: 'Please complete the payment form.' };
      }
      paymentMethod[key] = key === 'cardNumber' ? value.replace(/\s+/g, '') : value;
    }

    return {
      success: true,
      payload: {
        shippingAddress,
        paymentMethod
      }
    };
  };

  // Initialize event handlers
  addCatalogHandlers();

  // ========================================================================
  // PUBLIC API
  // ========================================================================
  // Return object with methods that can be called from outside this module
  return {
    /**
     * showPanel - Shows store panel and loads all data
     * WHY: Called when user navigates to store page
     */
    showPanel: () => {
      refs.panel.classList.remove('hidden');
      refreshAll(); // Load catalog, cart, and history
    },
    
    /**
     * hidePanel - Hides store panel and resets state
     * WHY: Called when navigating away from store
     */
    hidePanel: () => {
      refs.panel.classList.add('hidden');
      resetPanel();
    },
    
    showMessage: (message, type) => setMessage(message, type),
    clearMessage: () => setMessage('')
  };
}
