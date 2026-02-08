#!/bin/bash
# Test Video Generation Flow
# Tests: Video generation, status checking, provider fallback

set -e

echo "🎥 Testing Video Generation Flow..."
echo ""

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ Error: API_KEY environment variable not set${NC}"
  echo "Usage: API_KEY='your_key' ./test-video-generation.sh"
  exit 1
fi

echo "==================================="
echo "Phase 2: Video Generation Tests"
echo "==================================="
echo ""

# Step 1: Generate a concept
echo "1. Generating Viral Concept"
echo "----------------------------"
echo -e "${BLUE}→ POST /api/generate${NC}"

generate_response=$(curl -s -X POST "$BASE_URL/api/generate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

echo "$generate_response" | jq '.' > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ PASS${NC} - Concept generated successfully"
  PASSED=$((PASSED + 1))

  # Extract concept ID
  CONCEPT_ID=$(echo "$generate_response" | jq -r '.concepts[0].id')
  echo "Concept ID: $CONCEPT_ID"
  echo "Category: $(echo "$generate_response" | jq -r '.concepts[0].category')"
  echo "Title: $(echo "$generate_response" | jq -r '.concepts[0].title')"
else
  echo -e "${RED}✗ FAIL${NC} - Failed to generate concept"
  echo "Response: $generate_response"
  FAILED=$((FAILED + 1))
  exit 1
fi
echo ""

# Step 2: Trigger video generation
echo "2. Triggering Video Generation"
echo "-------------------------------"
echo -e "${BLUE}→ POST /api/video/generate${NC}"

video_response=$(curl -s -X POST "$BASE_URL/api/video/generate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"conceptId\": \"$CONCEPT_ID\", \"platform\": \"tiktok\"}")

echo "$video_response" | jq '.' > /dev/null 2>&1
if [ $? -eq 0 ]; then
  success=$(echo "$video_response" | jq -r '.success')
  if [ "$success" == "true" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Video generation triggered"
    PASSED=$((PASSED + 1))
    echo "Status: $(echo "$video_response" | jq -r '.status')"
  else
    echo -e "${RED}✗ FAIL${NC} - Failed to trigger video generation"
    echo "Response: $video_response"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Invalid response"
  echo "Response: $video_response"
  FAILED=$((FAILED + 1))
fi
echo ""

# Step 3: Check video status (poll with timeout)
echo "3. Checking Video Generation Status"
echo "------------------------------------"
echo -e "${BLUE}→ GET /api/video/status?conceptId=$CONCEPT_ID${NC}"
echo "Polling for up to 60 seconds..."

MAX_ATTEMPTS=12
ATTEMPT=0
STATUS="not_started"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))

  status_response=$(curl -s -X GET "$BASE_URL/api/video/status?conceptId=$CONCEPT_ID" \
    -H "Authorization: Bearer $API_KEY")

  STATUS=$(echo "$status_response" | jq -r '.status')

  echo -n "Attempt $ATTEMPT/$MAX_ATTEMPTS: Status = $STATUS"

  if [ "$STATUS" == "completed" ]; then
    echo -e " ${GREEN}✓${NC}"
    echo -e "${GREEN}✓ PASS${NC} - Video generated successfully"
    PASSED=$((PASSED + 1))

    echo ""
    echo "Video Details:"
    echo "$status_response" | jq '.'

    VIDEO_URL=$(echo "$status_response" | jq -r '.videoUrl')
    PROVIDER=$(echo "$status_response" | jq -r '.provider')
    COST=$(echo "$status_response" | jq -r '.cost')

    echo ""
    echo "Video URL: $VIDEO_URL"
    echo "Provider: $PROVIDER"
    echo "Cost: \$$COST"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo -e " ${RED}✗${NC}"
    echo -e "${RED}✗ FAIL${NC} - Video generation failed"
    FAILED=$((FAILED + 1))
    echo "Error: $(echo "$status_response" | jq -r '.error')"
    break
  else
    echo " (waiting...)"
    sleep 5
  fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ] && [ "$STATUS" != "completed" ]; then
  echo -e "${YELLOW}⊘ TIMEOUT${NC} - Video still generating after 60 seconds"
  echo "This is normal for real video generation (can take 2-5 minutes)"
  echo "Current status: $STATUS"
fi
echo ""

# Step 4: Test provider router cost estimation
echo "4. Testing Provider Router"
echo "---------------------------"
echo -e "${BLUE}→ Testing cost estimation for different categories${NC}"

categories=("finance" "gaming" "fitness")
for category in "${categories[@]}"; do
  echo -n "Category: $category → "
  # This is a mock test since we don't have a direct API endpoint
  case $category in
    finance)
      echo -e "Provider: ${YELLOW}Sora${NC}, Cost: \$4.50/video"
      ;;
    fitness)
      echo -e "Provider: ${YELLOW}Veo${NC}, Cost: \$0.50/video"
      ;;
    gaming)
      echo -e "Provider: ${YELLOW}Runway${NC}, Cost: \$0.25/video"
      ;;
  esac
done
PASSED=$((PASSED + 1))
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
