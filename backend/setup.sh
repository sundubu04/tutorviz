#!/bin/bash

# TutoriAI Backend Setup Script
# This script sets up the backend environment, installs dependencies, and initializes the database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    print_error "This script must be run from the backend directory"
    print_status "Please run: cd backend && ./setup.sh"
    exit 1
fi

print_status "🚀 Starting TutoriAI Backend Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_success "Node.js is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm is installed"

# Check if PostgreSQL is running
print_status "Checking PostgreSQL status..."
if command -v pg_isready &> /dev/null; then
    if pg_isready &> /dev/null; then
        print_success "PostgreSQL is running"
    else
        print_warning "PostgreSQL is not running"
        print_status "Please start PostgreSQL before continuing:"
        print_status "  macOS: brew services start postgresql"
        print_status "  Linux: sudo systemctl start postgresql"
        print_status "  Windows: Start PostgreSQL service from Services"
        print_status ""
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Setup cancelled. Please start PostgreSQL and run setup again."
            exit 0
        fi
    fi
else
    print_warning "PostgreSQL client not found. Make sure PostgreSQL is installed."
fi

# Check if psql is available
if command -v psql &> /dev/null; then
    print_success "PostgreSQL client (psql) found"
else
    print_warning "PostgreSQL client (psql) not found. Make sure PostgreSQL is installed."
fi

# Run the Node.js setup script
print_status "Running Node.js setup script..."
node setup.js

print_success "Backend setup completed!"
print_status ""
print_status "Next steps:"
print_status "1. Start the backend: npm start"
print_status "2. Start the frontend: cd ../frontend && python -m http.server 3000"
print_status "3. Open http://localhost:3000 in your browser" 