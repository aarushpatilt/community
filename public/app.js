const API_BASE_URL = 'http://localhost:3000/api';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update forms
    document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('signup-form').classList.add('active');
    }

    // Clear messages
    clearMessages();
}

function clearMessages() {
    document.getElementById('login-message').textContent = '';
    document.getElementById('login-message').className = 'message';
    document.getElementById('signup-message').textContent = '';
    document.getElementById('signup-message').className = 'message';
}

function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

function setLoading(form, isLoading) {
    const btn = form.querySelector('button[type="submit"]');
    if (isLoading) {
        form.classList.add('loading');
        btn.disabled = true;
    } else {
        form.classList.remove('loading');
        btn.disabled = false;
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    setLoading(form, true);
    clearMessages();

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Store token
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            showMessage('login-message', result.message, 'success');
            
            // Show user info after a short delay
            setTimeout(() => {
                showUserInfo(result.user);
            }, 1000);
        } else {
            showMessage('login-message', result.message, 'error');
        }
    } catch (error) {
        showMessage('login-message', 'Network error. Please check if the server is running.', 'error');
        console.error('Login error:', error);
    } finally {
        setLoading(form, false);
    }
});

// Signup form handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    setLoading(form, true);
    clearMessages();

    try {
        const response = await fetch(`${API_BASE_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // Store token
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            showMessage('signup-message', result.message, 'success');
            
            // Show user info after a short delay
            setTimeout(() => {
                showUserInfo(result.user);
            }, 1000);
        } else {
            showMessage('signup-message', result.message, 'error');
        }
    } catch (error) {
        showMessage('signup-message', 'Network error. Please check if the server is running.', 'error');
        console.error('Signup error:', error);
    } finally {
        setLoading(form, false);
    }
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    hideUserInfo();
    switchTab('login');
    clearMessages();
});

function showUserInfo(user) {
    // Hide forms
    document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Show user info
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-id').textContent = user.id;
    document.getElementById('user-info').classList.remove('hidden');
}

function hideUserInfo() {
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('login-form').classList.add('active');
    document.querySelector('[data-tab="login"]').classList.add('active');
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            showUserInfo(user);
        } catch (e) {
            console.error('Error parsing user data:', e);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
});

