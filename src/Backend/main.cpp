/**
 * Main entry point for C++ backend server
 * This replaces server.js
 */

#include "Server.h"
#include <iostream>

int main(int argc, char* argv[]) {
    int port = 3000;
    
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }

    Server server(port);
    server.start();

    return 0;
}

