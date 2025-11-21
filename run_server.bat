@echo off
REM Run the backend server and show MongoDB connection status

echo Starting backend server...
echo.
echo Look for these messages:
echo   - "Attempting to connect to MongoDB..." = Trying to connect
echo   - "MongoDB: Connected successfully" = MongoDB is working!
echo   - "MongoDB: Driver not available" = MongoDB driver not found
echo   - "MongoDB connection failed" = Connection error (check password/IP)
echo   - "Using in-memory storage" = Fallback mode (no MongoDB)
echo.
echo Press Ctrl+C to stop the server
echo.

.\backend.exe 3000

