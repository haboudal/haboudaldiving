#!/bin/bash

# API Test Script for Diving Platform
# Run this after the server is started with: npm run dev

BASE_URL="http://localhost:3001/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  Diving Platform - API Test Suite"
echo "=========================================="
echo ""

# Check if server is running
echo -e "${BLUE}Checking server status...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}Server is not running!${NC}"
    echo "Start it with: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test variables
ACCESS_TOKEN=""
USER_ID=""

# Helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local auth=$5

    echo -e "${YELLOW}Testing:${NC} $description"
    echo "  $method $endpoint"

    local headers="-H 'Content-Type: application/json'"
    if [ -n "$auth" ]; then
        headers="$headers -H 'Authorization: Bearer $auth'"
    fi

    if [ -n "$data" ]; then
        response=$(eval "curl -s -X $method '$BASE_URL$endpoint' $headers -d '$data'")
    else
        response=$(eval "curl -s -X $method '$BASE_URL$endpoint' $headers")
    fi

    # Check for success
    if echo "$response" | grep -q '"success":true'; then
        echo -e "  ${GREEN}✓ Success${NC}"
    else
        echo -e "  ${RED}✗ Failed${NC}"
        echo "  Response: $response"
    fi
    echo ""

    echo "$response"
}

echo "=========================================="
echo "  1. Health Check"
echo "=========================================="
echo ""

response=$(curl -s http://localhost:3001/health)
echo "GET /health"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

echo "=========================================="
echo "  2. User Registration"
echo "=========================================="
echo ""

REGISTER_DATA='{
  "email": "test.diver@example.com",
  "password": "TestPass123",
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "role": "diver",
  "preferredLanguage": "en"
}'

echo "POST /auth/register"
echo "Payload: $REGISTER_DATA"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

echo "Response:"
echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract token if successful
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tokens']['accessToken'])" 2>/dev/null)
    USER_ID=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['user']['id'])" 2>/dev/null)
    echo ""
    echo -e "${GREEN}✓ Registration successful${NC}"
    echo "  User ID: $USER_ID"
fi
echo ""

echo "=========================================="
echo "  3. User Login"
echo "=========================================="
echo ""

LOGIN_DATA='{
  "email": "test.diver@example.com",
  "password": "TestPass123"
}'

echo "POST /auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

echo "Response:"
echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
    echo ""
    echo -e "${GREEN}✓ Login successful${NC}"
fi
echo ""

echo "=========================================="
echo "  4. Get Current User (Authenticated)"
echo "=========================================="
echo ""

if [ -n "$ACCESS_TOKEN" ]; then
    echo "GET /users/me"
    echo "Authorization: Bearer \$TOKEN"
    ME_RESPONSE=$(curl -s -X GET "$BASE_URL/users/me" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    echo "Response:"
    echo "$ME_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ME_RESPONSE"
else
    echo -e "${YELLOW}Skipped - no access token${NC}"
fi
echo ""

echo "=========================================="
echo "  5. List Diving Centers (Public)"
echo "=========================================="
echo ""

echo "GET /centers"
CENTERS_RESPONSE=$(curl -s -X GET "$BASE_URL/centers")

echo "Response:"
echo "$CENTERS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CENTERS_RESPONSE"
echo ""

echo "=========================================="
echo "  6. List Instructors (Public)"
echo "=========================================="
echo ""

echo "GET /instructors"
INSTRUCTORS_RESPONSE=$(curl -s -X GET "$BASE_URL/instructors")

echo "Response:"
echo "$INSTRUCTORS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INSTRUCTORS_RESPONSE"
echo ""

echo "=========================================="
echo "  7. Check SRSA Quota (Authenticated)"
echo "=========================================="
echo ""

if [ -n "$ACCESS_TOKEN" ]; then
    QUOTA_DATA='{
      "siteCode": "JEDDAH_01",
      "date": "2025-01-15",
      "numberOfDivers": 10
    }'

    echo "POST /quota/check"
    QUOTA_RESPONSE=$(curl -s -X POST "$BASE_URL/quota/check" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d "$QUOTA_DATA")

    echo "Response:"
    echo "$QUOTA_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUOTA_RESPONSE"
else
    echo -e "${YELLOW}Skipped - no access token${NC}"
fi
echo ""

echo "=========================================="
echo "  8. Get Quota Forecast (Authenticated)"
echo "=========================================="
echo ""

if [ -n "$ACCESS_TOKEN" ]; then
    echo "GET /quota/forecast/JEDDAH_01"
    FORECAST_RESPONSE=$(curl -s -X GET "$BASE_URL/quota/forecast/JEDDAH_01" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    echo "Response:"
    echo "$FORECAST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$FORECAST_RESPONSE"
else
    echo -e "${YELLOW}Skipped - no access token${NC}"
fi
echo ""

echo "=========================================="
echo -e "  ${GREEN}Tests Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary of available endpoints:"
echo "  POST   /api/v1/auth/register"
echo "  POST   /api/v1/auth/login"
echo "  POST   /api/v1/auth/logout"
echo "  POST   /api/v1/auth/refresh"
echo "  GET    /api/v1/users/me"
echo "  GET    /api/v1/divers/:id/profile"
echo "  GET    /api/v1/centers"
echo "  POST   /api/v1/centers"
echo "  GET    /api/v1/instructors"
echo "  POST   /api/v1/quota/check"
echo "  GET    /api/v1/quota/forecast/:siteCode"
echo ""
