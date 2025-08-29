#!/bin/bash

# TutoriAI Docker Management Script

set -e

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi
}

# Function to get docker-compose command
get_docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Function to start services
start_services() {
    local env=${1:-"dev"}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    fi
    
    print_status "Starting TutoriAI services in $env mode..."
    
    local cmd=$(get_docker_compose_cmd)
    $cmd -f $compose_file up -d
    
    print_success "Services started successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:5001"
    print_status "PostgreSQL: localhost:5432"
}

# Function to stop services
stop_services() {
    local env=${1:-"dev"}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    fi
    
    print_status "Stopping TutoriAI services..."
    
    local cmd=$(get_docker_compose_cmd)
    $cmd -f $compose_file down
    
    print_success "Services stopped successfully!"
}

# Function to restart services
restart_services() {
    local env=${1:-"dev"}
    stop_services "$env"
    start_services "$env"
}

# Function to view logs
view_logs() {
    local env=${1:-"dev"}
    local service=${2:-""}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    fi
    
    local cmd=$(get_docker_compose_cmd)
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        $cmd -f $compose_file logs -f
    else
        print_status "Showing logs for $service service..."
        $cmd -f $compose_file logs -f "$service"
    fi
}

# Function to build services
build_services() {
    local env=${1:-"dev"}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    fi
    
    print_status "Building TutoriAI services in $env mode..."
    
    local cmd=$(get_docker_compose_cmd)
    $cmd -f $compose_file build --no-cache
    
    print_success "Services built successfully!"
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker resources..."
        
        local cmd=$(get_docker_compose_cmd)
        $cmd -f docker-compose.yml down -v --remove-orphans
        $cmd -f docker-compose.dev.yml down -v --remove-orphans
        
        docker system prune -f
        docker volume prune -f
        
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show status
show_status() {
    local env=${1:-"dev"}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    fi
    
    print_status "Service status for $env mode:"
    
    local cmd=$(get_docker_compose_cmd)
    $cmd -f $compose_file ps
}

# Function to show help
show_help() {
    echo "TutoriAI Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [env]     Start services (env: dev|prod, default: dev)"
    echo "  stop [env]      Stop services (env: dev|prod, default: dev)"
    echo "  restart [env]   Restart services (env: dev|prod, default: dev)"
    echo "  logs [env] [service]  View logs (env: dev|prod, default: dev)"
    echo "  build [env]     Build services (env: dev|prod, default: dev)"
    echo "  status [env]    Show service status (env: dev|prod, default: dev)"
    echo "  cleanup         Remove all containers, networks, and volumes"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start        # Start development services"
    echo "  $0 start prod   # Start production services"
    echo "  $0 logs dev backend  # View backend logs in dev mode"
    echo "  $0 cleanup      # Clean up all Docker resources"
}

# Main script logic
main() {
    check_docker
    check_docker_compose
    
    case "${1:-help}" in
        start)
            start_services "${2:-dev}"
            ;;
        stop)
            stop_services "${2:-dev}"
            ;;
        restart)
            restart_services "${2:-dev}"
            ;;
        logs)
            view_logs "${2:-dev}" "${3:-}"
            ;;
        build)
            build_services "${2:-dev}"
            ;;
        status)
            show_status "${2:-dev}"
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
