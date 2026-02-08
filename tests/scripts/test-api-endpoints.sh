#!/bin/bash
# Test All API Endpoints
# Complete API testing suite

set -e

echo "🔌 Testing All API Endpoints..."
echo ""

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_api() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local requires_auth=$5

  echo -e "${BLUE}→ $method $endpoint${NC}"
  echo -n "  Testing: $name... "

  if [ "$requires_auth" == "true" ]; then
    if [ -z "$API_KEY" ]; then
      echo -e "${YELLOW}⊘ SKIP${NC} (No API key)"
      return
    fi

    if [ -z "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $API_KEY")
    else
      response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  else
    if [ -z "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
      response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  fi

  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$status" == "200" ] || [ "$status" == "307" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Status: $status)"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

echo "==================================="
echo "API Endpoint Tests"
echo "==================================="
echo ""

# Content Generation APIs
echo "1. Content Generation APIs"
echo "--------------------------"
test_api "Generate concepts" "POST" "/api/generate" "" "true"
test_api "Get trends" "GET" "/api/trends" "" "false"
test_api "Get history" "GET" "/api/history" "" "true"
echo ""

# User Management APIs
echo "2. User Management APIs"
echo "-----------------------"
test_api "Get user concepts" "GET" "/api/user/concepts" "" "true"
test_api "Get user usage" "GET" "/api/user/usage" "" "true"
echo ""

# Video Generation APIs
echo "3. Video Generation APIs"
echo "------------------------"
test_api "Check Inngest endpoint" "GET" "/api/inngest" "" "false"
# Video generate requires conceptId, will be tested in video generation script
echo "  Note: Full video generation tested in test-video-generation.sh"
echo ""

# Billing APIs
echo "4. Billing APIs"
echo "---------------"
echo "  Note: Billing tests require Stripe test mode"
echo "  Run manually: POST /api/billing/create-checkout with tier=STARTER"
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}⚠ Warning: No API_KEY set, some tests skipped${NC}"
  echo "To run full tests: export API_KEY='your_api_key'"
  echo ""
fi

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
