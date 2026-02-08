#!/bin/bash
# Setup Validation Script
# Checks if system is ready for video generation testing

echo "🔍 Checking System Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Check 1: Server Running
echo "Checking server..."
if curl -s http://localhost:3000 > /dev/null; then
  echo -e "${GREEN}✓${NC} Server is running on port 3000"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Server is NOT running"
  echo "  Run: npm run dev"
  ((FAIL++))
fi
echo ""

# Check 2: Database Connection
echo "Checking database..."
if npx prisma db pull --force 2>&1 | grep -q "Prisma schema loaded"; then
  echo -e "${GREEN}✓${NC} Database connected"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Database connection failed"
  echo "  Check DATABASE_URL in .env.local"
  ((FAIL++))
fi
echo ""

# Check 3: API Keys in .env.local
echo "Checking environment variables..."

if [ -f ".env.local" ]; then
  echo -e "${GREEN}✓${NC} .env.local exists"
  ((PASS++))
else
  echo -e "${RED}✗${NC} .env.local not found"
  echo "  Create .env.local with required keys"
  ((FAIL++))
fi
echo ""

# Check 4: Trend APIs
echo "Checking trend APIs..."

# YouTube API
if grep -q "YOUTUBE_API_KEY=" .env.local 2>/dev/null; then
  YOUTUBE_KEY=$(grep YOUTUBE_API_KEY .env.local | cut -d '=' -f 2 | tr -d '"')
  if [ ! -z "$YOUTUBE_KEY" ] && [ "$YOUTUBE_KEY" != "..." ]; then
    echo -e "${GREEN}✓${NC} YouTube API key configured"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} YouTube API key empty"
    ((WARN++))
  fi
else
  echo -e "${YELLOW}⚠${NC} YouTube API key not found"
  ((WARN++))
fi

# GNews API
if grep -q "GNEWS_API_KEY=" .env.local 2>/dev/null; then
  GNEWS_KEY=$(grep GNEWS_API_KEY .env.local | cut -d '=' -f 2 | tr -d '"')
  if [ ! -z "$GNEWS_KEY" ] && [ "$GNEWS_KEY" != "..." ]; then
    echo -e "${GREEN}✓${NC} GNews API key configured"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} GNews API key empty"
    ((WARN++))
  fi
else
  echo -e "${YELLOW}⚠${NC} GNews API key not found"
  ((WARN++))
fi
echo ""

# Check 5: Video Provider APIs
echo "Checking video provider APIs..."

# Runway
if grep -q "RUNWAY_API_KEY=" .env.local 2>/dev/null; then
  RUNWAY_KEY=$(grep RUNWAY_API_KEY .env.local | cut -d '=' -f 2 | tr -d '"')
  if [ ! -z "$RUNWAY_KEY" ] && [ "$RUNWAY_KEY" != "..." ]; then
    echo -e "${GREEN}✓${NC} Runway API key configured"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} Runway API key empty"
    ((WARN++))
  fi
else
  echo -e "${YELLOW}⚠${NC} Runway API key not found"
  ((WARN++))
fi

# OpenAI (Sora)
if grep -q "OPENAI_API_KEY=" .env.local 2>/dev/null; then
  OPENAI_KEY=$(grep OPENAI_API_KEY .env.local | cut -d '=' -f 2 | tr -d '"')
  if [ ! -z "$OPENAI_KEY" ] && [ "$OPENAI_KEY" != "..." ] && [ "$OPENAI_KEY" != "sk-..." ]; then
    echo -e "${GREEN}✓${NC} OpenAI API key configured"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} OpenAI API key empty"
    ((WARN++))
  fi
else
  echo -e "${YELLOW}⚠${NC} OpenAI API key not found"
  ((WARN++))
fi
echo ""

# Check 6: AWS S3 (Optional)
echo "Checking AWS S3 (optional)..."
if grep -q "AWS_ACCESS_KEY_ID=" .env.local 2>/dev/null; then
  AWS_KEY=$(grep AWS_ACCESS_KEY_ID .env.local | cut -d '=' -f 2 | tr -d '"')
  if [ ! -z "$AWS_KEY" ] && [ "$AWS_KEY" != "..." ] && [ "$AWS_KEY" != "AKIAIOSFODNN7EXAMPLE" ]; then
    echo -e "${GREEN}✓${NC} AWS credentials configured"
    ((PASS++))
  else
    echo -e "${YELLOW}⚠${NC} AWS credentials empty (videos will use provider storage)"
    ((WARN++))
  fi
else
  echo -e "${YELLOW}⚠${NC} AWS not configured (videos will use provider storage)"
  ((WARN++))
fi
echo ""

# Summary
echo "=========================================="
echo "SETUP VALIDATION SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ System ready for testing!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Generate concept: curl -X POST http://localhost:3000/api/generate -H \"Authorization: Bearer YOUR_API_KEY\""
  echo "2. Check: TEST_FIRST_VIDEO.md for full testing guide"
  exit 0
else
  echo -e "${RED}❌ System NOT ready${NC}"
  echo ""
  echo "Fix the failed checks above, then re-run:"
  echo "  bash tests/scripts/check-setup.sh"
  exit 1
fi
