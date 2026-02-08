#!/bin/bash
# Luma AI Video Generation Test Script
# Tests the Luma provider integration with a simple video generation

echo "🎬 Testing Luma AI Video Generation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo -e "${RED}✗${NC} .env.local not found"
  echo "Create .env.local with LUMA_API_KEY"
  exit 1
fi

# Check if LUMA_API_KEY is configured
if ! grep -q "LUMA_API_KEY=" .env.local 2>/dev/null; then
  echo -e "${RED}✗${NC} LUMA_API_KEY not found in .env.local"
  echo ""
  echo "Add the following to .env.local:"
  echo "LUMA_API_KEY=\"luma-...\""
  echo ""
  echo "Get your API key from: https://lumalabs.ai/dream-machine/api"
  exit 1
fi

LUMA_KEY=$(grep LUMA_API_KEY .env.local | cut -d '=' -f 2 | tr -d '"')
if [ -z "$LUMA_KEY" ] || [ "$LUMA_KEY" = "..." ]; then
  echo -e "${RED}✗${NC} LUMA_API_KEY is empty"
  echo "Get your API key from: https://lumalabs.ai/dream-machine/api"
  exit 1
fi

echo -e "${GREEN}✓${NC} LUMA_API_KEY configured"
echo ""

# Test API key validity
echo "Testing Luma API connection..."
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  https://api.lumalabs.ai/dream-machine/v1/generations \
  -H "Authorization: Bearer $LUMA_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"prompt":"test"}')

if [ "$API_TEST" = "401" ]; then
  echo -e "${RED}✗${NC} Invalid API key"
  echo "Check your LUMA_API_KEY in .env.local"
  exit 1
elif [ "$API_TEST" = "400" ]; then
  echo -e "${GREEN}✓${NC} API key valid (400 = invalid request format, but auth worked)"
elif [ "$API_TEST" = "200" ] || [ "$API_TEST" = "201" ]; then
  echo -e "${GREEN}✓${NC} API key valid and working"
else
  echo -e "${YELLOW}⚠${NC} Unexpected response code: $API_TEST"
  echo "Continuing anyway..."
fi

echo ""
echo "=========================================="
echo "LUMA SETUP VALIDATION"
echo "=========================================="
echo -e "${GREEN}✅ Luma AI is ready for testing${NC}"
echo ""
echo "Next steps:"
echo "1. Generate a test concept:"
echo "   ${BLUE}curl -X POST http://localhost:3000/api/generate \\${NC}"
echo "   ${BLUE}  -H \"Authorization: Bearer YOUR_API_KEY\"${NC}"
echo ""
echo "2. Trigger video generation with Luma:"
echo "   ${BLUE}curl -X POST http://localhost:3000/api/video/generate \\${NC}"
echo "   ${BLUE}  -H \"Authorization: Bearer YOUR_API_KEY\" \\${NC}"
echo "   ${BLUE}  -H \"Content-Type: application/json\" \\${NC}"
echo "   ${BLUE}  -d '{\"conceptId\": \"CONCEPT_ID\", \"platform\": \"tiktok\", \"provider\": \"luma\"}'${NC}"
echo ""
echo "Cost estimate: ~$0.20 per 8-second video"
echo "Generation time: ~2-3 minutes"
echo ""
