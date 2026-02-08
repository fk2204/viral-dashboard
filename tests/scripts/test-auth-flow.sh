#!/bin/bash
# Test Authentication Flow
# Tests: Sign up, Sign in, API key generation, API authentication

set -e

echo "🧪 Testing Authentication Flow..."
echo ""

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5

  echo -n "Testing: $name... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$status" == "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

echo "==================================="
echo "Phase 1: Authentication Tests"
echo "==================================="
echo ""

# Test 1: Public routes (should work without auth)
echo "1. Testing Public Routes"
echo "------------------------"
test_endpoint "Home page" "GET" "/" "" "200"
test_endpoint "Sign-in page" "GET" "/sign-in" "" "200"
test_endpoint "Sign-up page" "GET" "/sign-up" "" "200"
echo ""

# Test 2: Protected routes (should redirect/401 without auth)
echo "2. Testing Protected Routes (No Auth)"
echo "--------------------------------------"
test_endpoint "Dashboard (no auth)" "GET" "/dashboard" "" "307"
test_endpoint "Generate API (no auth)" "POST" "/api/generate" "" "401"
test_endpoint "User concepts (no auth)" "GET" "/api/user/concepts" "" "401"
test_endpoint "User usage (no auth)" "GET" "/api/user/usage" "" "401"
echo ""

# Test 3: API Key authentication
echo "3. Testing API Key Authentication"
echo "----------------------------------"
echo -e "${YELLOW}Note: Requires valid API key in environment variable: API_KEY${NC}"

if [ -n "$API_KEY" ]; then
  echo "Testing with API key: ${API_KEY:0:10}..."

  # Test user usage endpoint
  response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/user/usage" \
    -H "Authorization: Bearer $API_KEY")

  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$status" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - API key authentication working"
    echo "Response: $body" | jq '.'
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - API key authentication failed (Status: $status)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} - No API_KEY environment variable set"
  echo "To test: export API_KEY='your_api_key_here'"
fi
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
