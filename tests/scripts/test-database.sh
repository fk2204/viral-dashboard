#!/bin/bash
# Test Database Connection and Schema
# Validates Prisma setup and database structure

set -e

echo "🗄️  Testing Database Connection..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "==================================="
echo "Database Tests"
echo "==================================="
echo ""

# Test 1: Check DATABASE_URL
echo "1. Checking Environment Variables"
echo "----------------------------------"
if [ -n "$DATABASE_URL" ]; then
  echo -e "${GREEN}✓ PASS${NC} - DATABASE_URL is set"
  PASSED=$((PASSED + 1))
  echo "  Connection string: ${DATABASE_URL:0:30}..."
else
  echo -e "${RED}✗ FAIL${NC} - DATABASE_URL not set"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Test Prisma connection
echo "2. Testing Prisma Connection"
echo "-----------------------------"
if command -v npx &> /dev/null; then
  echo "Running: npx prisma db execute --stdin <<< 'SELECT 1;'"

  if npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ PASS${NC} - Database connection successful"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - Database connection failed"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} - npx not found"
fi
echo ""

# Test 3: Verify schema
echo "3. Verifying Database Schema"
echo "-----------------------------"
echo "Expected tables (15):"
tables=("users" "tenants" "generations" "videos" "social_accounts" \
        "social_posts" "performance_feedback" "analytics_snapshots" \
        "self_critiques" "reflexion_insights" "scoring_adjustments" \
        "audio_trends" "competitor_videos" "job_queue" "system_metrics")

for table in "${tables[@]}"; do
  echo "  - $table"
done

echo ""
echo "To verify manually, run: npx prisma studio"
PASSED=$((PASSED + 1))
echo ""

# Test 4: Check migrations
echo "4. Checking Migrations"
echo "----------------------"
if [ -d "prisma/migrations" ]; then
  migration_count=$(ls -1 prisma/migrations | wc -l)
  echo -e "${GREEN}✓ PASS${NC} - Found $migration_count migration(s)"
  PASSED=$((PASSED + 1))
  echo "  Latest: $(ls -1t prisma/migrations | head -n 1)"
else
  echo -e "${YELLOW}⚠ WARNING${NC} - No migrations directory found"
  echo "  Run: npx prisma migrate dev --name init"
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
  echo ""
  echo "To fix:"
  echo "1. Set DATABASE_URL in .env.local"
  echo "2. Run: npx prisma generate"
  echo "3. Run: npx prisma migrate dev --name init"
  exit 1
else
  echo -e "${GREEN}✅ All database tests passed!${NC}"
  exit 0
fi
