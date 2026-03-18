#!/bin/bash

# TutoriAI Setup Script
# This script sets up the entire TutoriAI application

set -e  # Exit on any error

echo "🚀 Setting up TutoriAI..."

# Add Homebrew to PATH if not already there
export PATH="/opt/homebrew/bin:$PATH"

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

# Check if PostgreSQL is running
print_status "Checking PostgreSQL status..."
if ! pg_isready -q; then
    print_error "PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi
print_success "PostgreSQL is running"

# Create database if it doesn't exist
print_status "Creating database..."
createdb tutoriai_db 2>/dev/null || print_warning "Database 'tutoriai_db' already exists"
print_success "Database ready"

# Setup backend
print_status "Setting up backend..."
cd backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file..."
    cp env.example .env
    # Update database user for macOS
    sed -i '' 's/DB_USER=postgres/DB_USER=mac/' .env
    sed -i '' 's/DB_PASSWORD=your_password/DB_PASSWORD=/' .env
    print_success ".env file created"
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
npm install

# Initialize database and sample data
print_status "Initializing database..."
npm run setup

print_success "Backend setup completed!"

# Setup frontend
print_status "Setting up frontend..."
cd ../frontend

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install

print_success "Frontend setup completed!"

echo ""
print_success "🎉 TutoriAI setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start the frontend server (in a new terminal):"
echo "   cd frontend && npm start"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5001"
echo ""
echo "📝 Sample credentials:"
echo "   Teacher: teacher@example.com (password: demo123)"
echo "   Student: student1@example.com (password: demo123)"
