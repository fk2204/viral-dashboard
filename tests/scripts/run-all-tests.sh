#!/bin/bash
# Master Test Runner
# Runs all test suites and generates comprehensive report

set -e

echo "🚀 Running Complete Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"

# Check if server is running
echo "Checking if development server is running..."
if curl -s "$BASE_URL" > /dev/null; then
  echo -e "${GREEN}✓${NC} Server is running at $BASE_URL"
else
  echo -e "${RED}✗${NC} Server is not running!"
  echo ""
  echo "Please start the development server first:"
  echo "  npm run dev"
  echo ""
  exit 1
fi
echo ""

# Test suites
SUITES=("test-database.sh" "test-auth-flow.sh" "test-api-endpoints.sh")
SUITE_NAMES=("Database Tests" "Authentication Flow" "API Endpoints")

# Optional suite (requires API key)
if [ -n "$API_KEY" ]; then
  SUITES+=("test-video-generation.sh")
  SUITE_NAMES+=("Video Generation")
fi

# Results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Run each test suite
for i in "${!SUITES[@]}"; do
  suite="${SUITES[$i]}"
  name="${SUITE_NAMES[$i]}"

  TOTAL_SUITES=$((TOTAL_SUITES + 1))

  echo "========================================"
  echo "Suite $((i + 1))/${#SUITES[@]}: $name"
  echo "========================================"
  echo ""

  if bash "tests/scripts/$suite"; then
    echo -e "${GREEN}✓ Suite passed: $name${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
  else
    echo -e "${RED}✗ Suite failed: $name${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
  fi

  echo ""
  echo ""
done

# Final summary
echo "========================================"
echo "FINAL TEST REPORT"
echo "========================================"
echo ""
echo "Test Suites:"
echo -e "  Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "  Failed: ${RED}$FAILED_SUITES${NC}"
echo "  Total:  $TOTAL_SUITES"
echo ""

if [ -z "$API_KEY" ]; then
  echo -e "${YELLOW}⚠ Note: Video generation tests skipped (no API key)${NC}"
  echo "  To run full tests: export API_KEY='your_api_key'"
  echo ""
fi

echo "Tested Components:"
echo "  ✓ Database connection & schema"
echo "  ✓ Authentication flow"
echo "  ✓ API endpoints"
if [ -n "$API_KEY" ]; then
  echo "  ✓ Video generation pipeline"
fi
echo ""

if [ $FAILED_SUITES -gt 0 ]; then
  echo -e "${RED}❌ TESTS FAILED${NC}"
  echo ""
  echo "Some test suites failed. Please check the output above."
  exit 1
else
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Your Viral Dashboard is working correctly! 🎉"
  exit 0
fi
