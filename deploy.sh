#!/bin/bash

# Credtz Lead Flow - Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env file not found. Creating from template..."
        cp .env.production .env
        log_warning "Please edit .env file with your configuration before running again."
        exit 1
    fi
    
    log_success "All requirements checked successfully!"
}

create_backup() {
    log_info "Creating backup..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="credtz_backup_${TIMESTAMP}"
    
    # Backup current deployment
    if docker-compose ps | grep -q "credtz-app"; then
        log_info "Stopping services for backup..."
        docker-compose stop
        
        # Create volume backup
        docker run --rm \
            -v credtz_postgres_data:/source \
            -v "$(pwd)/${BACKUP_DIR}:/backup" \
            alpine:latest \
            tar czf "/backup/${BACKUP_NAME}_postgres.tar.gz" -C /source .
        
        docker run --rm \
            -v credtz_redis_data:/source \
            -v "$(pwd)/${BACKUP_DIR}:/backup" \
            alpine:latest \
            tar czf "/backup/${BACKUP_NAME}_redis.tar.gz" -C /source .
    fi
    
    log_success "Backup created: ${BACKUP_NAME}"
}

build_and_deploy() {
    log_info "Building and deploying application..."
    
    # Load environment variables
    source .env
    
    # Build the application
    log_info "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Application is running successfully!"
    else
        log_error "Application health check failed!"
        docker-compose logs credtz-app
        exit 1
    fi
}

show_status() {
    log_info "Service Status:"
    docker-compose ps
    
    log_info "Application URLs:"
    echo "• Main Application: http://localhost:3000"
    echo "• Traefik Dashboard: http://localhost:8080"
    
    if [ -n "$DOMAIN" ]; then
        echo "• Production URL: https://$DOMAIN"
    fi
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    docker system prune -f
    log_success "Cleanup completed!"
}

# Main deployment function
main() {
    echo "=================================================="
    echo "     Credtz Lead Flow - Deployment Script        "
    echo "=================================================="
    
    case "${1:-deploy}" in
        "check")
            check_requirements
            ;;
        "backup")
            create_backup
            ;;
        "deploy")
            check_requirements
            create_backup
            build_and_deploy
            show_status
            cleanup_old_images
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose logs -f "${2:-credtz-app}"
            ;;
        "restart")
            log_info "Restarting services..."
            docker-compose restart
            show_status
            ;;
        "stop")
            log_info "Stopping services..."
            docker-compose stop
            ;;
        "update")
            log_info "Updating application..."
            git pull
            check_requirements
            create_backup
            build_and_deploy
            show_status
            cleanup_old_images
            ;;
        *)
            echo "Usage: $0 {deploy|check|backup|status|logs|restart|stop|update}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Full deployment (default)"
            echo "  check   - Check requirements only"
            echo "  backup  - Create backup only"
            echo "  status  - Show service status"
            echo "  logs    - Show application logs"
            echo "  restart - Restart services"
            echo "  stop    - Stop all services"
            echo "  update  - Git pull and redeploy"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"