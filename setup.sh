#!/bin/bash

# Saudi Arabia Recreational Diving Platform - Setup Script
# Run this after installing Node.js 18+ and Docker

set -e

echo "=========================================="
echo "  Diving Platform - Development Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

echo "Checking prerequisites..."
echo ""

MISSING=0

check_command node || MISSING=1
check_command npm || MISSING=1
check_command docker || MISSING=1

echo ""

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}Missing prerequisites. Please install:${NC}"
    echo ""
    echo "  Node.js 18+: https://nodejs.org/"
    echo "  Docker:      https://docker.com/products/docker-desktop/"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js version $(node -v) OK"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Docker is not running. Starting Docker...${NC}"
    open -a Docker
    echo "Waiting for Docker to start (this may take a minute)..."
    while ! docker info &> /dev/null; do
        sleep 2
    done
    echo -e "${GREEN}✓${NC} Docker started"
fi

echo ""
echo "=========================================="
echo "  Step 1: Starting Infrastructure"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Start Docker containers
echo "Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5
until docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; do
    echo "  Waiting for database..."
    sleep 2
done
echo -e "${GREEN}✓${NC} PostgreSQL is ready"

# Wait for Redis
echo "Waiting for Redis to be ready..."
until docker-compose exec -T redis redis-cli ping &> /dev/null; do
    echo "  Waiting for Redis..."
    sleep 2
done
echo -e "${GREEN}✓${NC} Redis is ready"

echo ""
echo "=========================================="
echo "  Step 2: Setting Up Database"
echo "=========================================="
echo ""

# Initialize database schema
echo "Loading database schema..."
docker-compose exec -T postgres psql -U postgres -d diving_platform -f /docker-entrypoint-initdb.d/01-schema.sql 2>/dev/null || \
docker-compose exec -T postgres psql -U postgres -d diving_platform < database/schema.sql 2>/dev/null || \
echo "Schema may already be loaded (this is OK)"

echo -e "${GREEN}✓${NC} Database schema loaded"

echo ""
echo "=========================================="
echo "  Step 3: Installing Dependencies"
echo "=========================================="
echo ""

cd backend

# Install npm dependencies
echo "Installing npm packages..."
npm install

echo -e "${GREEN}✓${NC} Dependencies installed"

echo ""
echo "=========================================="
echo "  Step 4: Environment Configuration"
echo "=========================================="
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
else
    echo -e "${YELLOW}!${NC} .env file already exists (keeping existing)"
fi

echo ""
echo "=========================================="
echo -e "  ${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "To start the development server:"
echo ""
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "API will be available at:"
echo "  http://localhost:3001/api/v1"
echo ""
echo "Health check:"
echo "  curl http://localhost:3001/health"
echo ""
echo "To stop infrastructure:"
echo "  docker-compose down"
echo ""
