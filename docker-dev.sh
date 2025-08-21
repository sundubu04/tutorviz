#!/bin/bash

# TutoriAI Docker Development Script
# This script manages the Docker development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

case "$1" in
    "start")
        print_status "Starting TutoriAI development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        print_success "Development environment started!"
        print_status "Backend: http://localhost:5001"
        print_status "Database: localhost:5432"
        ;;
    "stop")
        print_status "Stopping TutoriAI development environment..."
        docker-compose -f docker-compose.dev.yml down
        print_success "Development environment stopped!"
        ;;
    "restart")
        print_status "Restarting TutoriAI development environment..."
        docker-compose -f docker-compose.dev.yml restart
        print_success "Development environment restarted!"
        ;;
    "logs")
        print_status "Showing logs..."
        docker-compose -f docker-compose.dev.yml logs -f
        ;;
    "backend-logs")
        print_status "Showing backend logs..."
        docker-compose -f docker-compose.dev.yml logs -f backend
        ;;
    "db-logs")
        print_status "Showing database logs..."
        docker-compose -f docker-compose.dev.yml logs -f postgres
        ;;
    "shell")
        print_status "Opening backend shell..."
        docker-compose -f docker-compose.dev.yml exec backend sh
        ;;
    "db-shell")
        print_status "Opening database shell..."
        docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d tutoriai_db
        ;;
    "reset")
        print_warning "This will remove all data and containers!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Resetting development environment..."
            docker-compose -f docker-compose.dev.yml down -v
            docker-compose -f docker-compose.dev.yml up -d
            print_success "Development environment reset!"
        else
            print_status "Reset cancelled."
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|backend-logs|db-logs|shell|db-shell|reset}"
        echo ""
        echo "Commands:"
        echo "  start       - Start the development environment"
        echo "  stop        - Stop the development environment"
        echo "  restart     - Restart the development environment"
        echo "  logs        - Show all logs"
        echo "  backend-logs - Show backend logs only"
        echo "  db-logs     - Show database logs only"
        echo "  shell       - Open shell in backend container"
        echo "  db-shell    - Open PostgreSQL shell"
        echo "  reset       - Reset all data and containers"
        exit 1
        ;;
esac

