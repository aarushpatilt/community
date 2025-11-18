# Community Authentication System

A MongoDB-based authentication system with login and signup functionality.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)

## Installation

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create a `.env` file in the root directory to override defaults:
```env
PORT=3000
MONGODB_URI=mongodb+srv://test123:test123@cluster0.ooqfbmp.mongodb.net/community-auth?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Note:** The server is already configured to use MongoDB Atlas by default. You can skip this step if you want to use the default configuration.

## Running the Application

1. The server is configured to use MongoDB Atlas. No local MongoDB setup needed!

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Features

- **Sign Up**: Create a new account with username, email, and password
- **Login**: Authenticate with username/email and password
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Passwords are hashed using bcrypt
- **Modern UI**: Clean and responsive design

## API Endpoints

### POST `/api/signup`
Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### POST `/api/login`
Login with existing credentials.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### GET `/api/me`
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

### GET `/api/health`
Health check endpoint.

## Testing

1. Start the server
2. Open `http://localhost:3000` in your browser
3. Try creating a new account with the Sign Up form
4. Log out and test logging in with your credentials

## Security Notes

- Change the `JWT_SECRET` in production
- Use environment variables for sensitive data
- Consider adding rate limiting for production
- Use HTTPS in production

