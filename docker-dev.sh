#!/bin/bash

# TutoriAI Development Docker Setup
# This script sets up the development environment with hot reloading

set -e

echo "🚀 Starting TutoriAI Development Environment..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start the development environment
print_status "Building and starting development containers..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Wait for database
print_status "Waiting for database..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U tutoriai_user -d tutoriai_dev > /dev/null 2>&1; do
    sleep 2
done
print_success "Database is ready!"

# Wait for backend
print_status "Waiting for backend..."
until curl -s http://localhost:5001/api/health > /dev/null 2>&1; do
    sleep 2
done
print_success "Backend is ready!"

# Wait for frontend
print_status "Waiting for frontend..."
until curl -s http://localhost:3000 > /dev/null 2>&1; do
    sleep 2
done
print_success "Frontend is ready!"

echo ""
print_success "🎉 TutoriAI Development Environment is ready!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  • View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  • Stop services: docker-compose -f docker-compose.dev.yml down"
echo "  • Restart services: docker-compose -f docker-compose.dev.yml restart"
echo "  • Rebuild: docker-compose -f docker-compose.dev.yml up --build"
echo ""
echo "🔄 Hot reloading is enabled for both frontend and backend!"
echo "   Changes to your code will automatically trigger rebuilds."
echo ""

# Show logs
print_status "Showing container logs (Ctrl+C to exit)..."
docker-compose -f docker-compose.dev.yml logs -f