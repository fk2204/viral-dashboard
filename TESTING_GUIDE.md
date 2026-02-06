# Testing Guide - Phase 1 Implementation

## Quick Start

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# http://localhost:3000
```

---

## Test Scenarios

### Test 1: Concept Generation & Caching ✅

**What it tests:** Server-side concept cache integration

```bash
# Method 1: Via UI
1. Open http://localhost:3000
2. Click "Generate New Concepts" button
3. Check browser console for 5 new concepts

# Method 2: Via API
curl -X POST http://localhost:3000/api/generate
```

**Expected Result:**
- Server logs show: `📦 Cached 5 concepts (expires in 48h)`
- Response contains 5 concepts with IDs
- Concepts are stored in server memory for 48 hours

---

### Test 2: Reflexion Auto-Trigger ✅

**What it tests:** Feedback submission triggers reflexion analysis

**Prerequisites:** Run Test 1 first to generate concepts

```bash
# Get a concept ID from the generation response
# Then submit feedback:

curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "<paste-concept-id-here>",
    "category": "fitness",
    "platform": "tiktok",
    "metrics": {
      "views": 10000,
      "likes": 1500,
      "comments": 200,
      "shares": 300
    }
  }'
```

**Expected Result:**
- Server logs show:
  ```
  ✅ Reflexion complete for <concept-id>
     Confidence: high
     Predicted: 75.0%, Actual: 68.5%
     Gap: -6.5%
  ```
- Response: `{ "success": true, "entry": {...} }`

---

### Test 3: Input Validation (Logical Constraints) ✅

**What it tests:** Validator rejects invalid data

**Test 3a: Likes exceed views**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "test-id",
    "category": "fitness",
    "platform": "tiktok",
    "metrics": {
      "views": 100,
      "likes": 200,
      "comments": 10,
      "shares": 5
    }
  }'
```

**Expected Result:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "metrics.likes",
      "message": "likes cannot exceed views"
    }
  ],
  "code": "VALIDATION_FAILED"
}
```

**Test 3b: Invalid category**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "test-id",
    "category": "invalid-category",
    "platform": "tiktok",
    "metrics": {
      "views": 100,
      "likes": 50,
      "comments": 10,
      "shares": 5
    }
  }'
```

**Expected Result:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "category",
      "message": "Invalid category. Must be one of: news, absurd, luxury, ..."
    }
  ],
  "code": "VALIDATION_FAILED"
}
```

---

### Test 4: Rate Limiting ✅

**What it tests:** API blocks excessive requests

**Method 1: Manual (slow)**
```bash
# Run this 11 times quickly (within 10 seconds):
curl -X POST http://localhost:3000/api/generate
```

**Method 2: Automated (fast)**
```bash
# Linux/Mac:
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/generate &
done
wait

# Windows (PowerShell):
1..11 | ForEach-Object {
  Start-Job { curl.exe -X POST http://localhost:3000/api/generate }
}
Get-Job | Wait-Job | Receive-Job
```

**Expected Result:**
- First 10 requests: 200 OK
- 11th request: 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1675889234567
```

---

### Test 5: Cache Miss (Old Concept) ✅

**What it tests:** Graceful handling of concepts >48h old

**Scenario:** Submit feedback for a concept ID that wasn't recently generated

```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "old-concept-id-12345",
    "category": "fitness",
    "platform": "tiktok",
    "metrics": {
      "views": 10000,
      "likes": 1500,
      "comments": 200,
      "shares": 300
    }
  }'
```

**Expected Result:**
- Feedback is recorded successfully: `{ "success": true, ... }`
- Server logs show: `⏭️ Reflexion skipped - concept not in cache (>48h old or not generated)`
- No errors thrown

---

### Test 6: Batch Reflexion (Cron Job) ✅

**What it tests:** Daily batch analysis processes cached concepts

**Prerequisites:** Run Tests 1-2 to generate concepts and feedback

```bash
# Run cron job manually (no auth required in dev):
curl -X POST http://localhost:3000/api/cron/reflexion
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Daily reflexion analysis complete",
  "stats": {
    "feedbackAnalyzed": 5,
    "cacheHits": 3,
    "cacheMisses": 2,
    "critiquesGenerated": 3,
    "adjustmentsApplied": 1,
    "insightsExtracted": 2,
    "effectivenessConfidence": 75.5
  },
  "timestamp": "2026-02-05T12:34:56.789Z"
}
```

**Server Logs:**
```
🔄 Starting daily reflexion analysis...
📊 Found 5 feedback entries to analyze
📦 Cache hits: 3, misses: 2
🤖 Running batch reflexion on 3 concepts...
✅ Batch reflexion complete: {...}
```

---

### Test 7: Cache Stats Monitoring ✅

**What it tests:** Cache statistics endpoint

```bash
# Get cache stats:
curl http://localhost:3000/api/cron/reflexion
```

**Expected Result:**
```json
{
  "summary": {
    "totalCritiques": 5,
    "totalAdjustments": 2,
    "avgGap": 12.5,
    "accuracyRate": 80.0,
    "topIssue": "Over-predicted fitness on TikTok"
  },
  "cacheStats": {
    "totalConcepts": 15,
    "validConcepts": 12,
    "expiredConcepts": 3,
    "oldestEntry": 1675789234567,
    "newestEntry": 1675889234567,
    "memoryUsageEstimate": "112.50 KB"
  },
  "message": "Reflexion system status"
}
```

---

### Test 8: Error Handling ✅

**What it tests:** Consistent error responses across all endpoints

**Test 8a: Missing required field**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "category": "fitness",
    "platform": "tiktok"
  }'
```

**Expected:** 400 with detailed errors

**Test 8b: Invalid JSON**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d 'invalid-json'
```

**Expected:** 400 with JSON parse error

**Test 8c: Internal server error simulation**
- Temporarily break `generateTrendData()` function
- Call `/api/generate`
- Verify error is logged with context and returns 500

---

## Integration Test (Full Flow)

**Simulates real user workflow:**

```bash
# Step 1: Generate concepts
RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate)
echo $RESPONSE | jq '.concepts[0].id'

# Step 2: Extract first concept ID
CONCEPT_ID=$(echo $RESPONSE | jq -r '.concepts[0].id')
echo "Testing with concept: $CONCEPT_ID"

# Step 3: Wait 2 seconds (simulate time passing)
sleep 2

# Step 4: Submit feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d "{
    \"conceptId\": \"$CONCEPT_ID\",
    \"category\": \"fitness\",
    \"platform\": \"tiktok\",
    \"metrics\": {
      \"views\": 10000,
      \"likes\": 1500,
      \"comments\": 200,
      \"shares\": 300
    }
  }"

# Step 5: Check reflexion was triggered (check server logs)

# Step 6: Run batch analysis
curl -X POST http://localhost:3000/api/cron/reflexion

# Step 7: Get stats
curl http://localhost:3000/api/reflexion?type=summary
```

**Expected:** All steps succeed, reflexion completes, stats updated

---

## Verification Checklist

After running tests, verify:

- [ ] **Type checking:** `npx tsc --noEmit` returns no errors
- [ ] **Server starts:** `npm run dev` runs without crashes
- [ ] **Concepts cached:** Logs show "📦 Cached X concepts"
- [ ] **Reflexion triggers:** Logs show "✅ Reflexion complete"
- [ ] **Validation rejects:** Invalid data returns 400 with details
- [ ] **Rate limiting works:** 11th request returns 429
- [ ] **Cache miss handled:** Old concepts skip gracefully
- [ ] **Batch analysis runs:** Cron job returns stats
- [ ] **Errors structured:** All errors include code + context

---

## Troubleshooting

### Issue: "Reflexion skipped - concept not in cache"

**Cause:** Concept was generated >48h ago, or server restarted

**Solution:** Generate new concepts before submitting feedback

---

### Issue: Rate limiting not working in dev

**Expected Behavior:** Rate limiting is bypassed in development mode (no Redis required)

**To Test Rate Limiting:** Set `UPSTASH_REDIS_REST_URL` in `.env.local`

---

### Issue: TypeScript errors on build

**Solution:**
```bash
# Check for errors:
npx tsc --noEmit

# If errors exist, review Phase 1 implementation
```

---

### Issue: Feedback recorded but reflexion doesn't trigger

**Possible Causes:**
1. Concept not in cache (>48h old) - Expected, check logs
2. `ANTHROPIC_API_KEY` not set - Reflexion will use fallback critique
3. Server error - Check logs for stack trace

**Debug:**
```bash
# Check if concept is in cache:
# Generate concept, note ID, immediately submit feedback
# Check server logs for cache hit/miss
```

---

## Advanced: Performance Testing

### Load Test (Concept Generation)

```bash
# Install Apache Bench (if needed):
# Ubuntu: sudo apt-get install apache2-utils
# Mac: brew install ab

# Run 100 requests with 10 concurrent:
ab -n 100 -c 10 -m POST http://localhost:3000/api/generate
```

**Expected:** Most requests succeed (rate limit will block some)

---

### Cache Performance

```bash
# Generate 20 batches of concepts (100 concepts total):
for i in {1..20}; do
  curl -s -X POST http://localhost:3000/api/generate > /dev/null
  echo "Batch $i generated"
done

# Check cache stats:
curl http://localhost:3000/api/cron/reflexion | jq '.cacheStats'
```

**Expected:**
- `validConcepts: 100`
- `memoryUsageEstimate: ~750 KB`

---

## CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Test Phase 1

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Type check
        run: npx tsc --noEmit

      - name: Start dev server
        run: npm run dev &
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Test concept generation
        run: curl -f http://localhost:3000/api/generate

      - name: Test validation
        run: |
          response=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/api/feedback \
            -H "Content-Type: application/json" \
            -d '{"conceptId":"test","category":"invalid","platform":"tiktok","metrics":{"views":100,"likes":200,"comments":10,"shares":5}}')
          if [[ "$response" != *"400"* ]]; then
            echo "Validation test failed"
            exit 1
          fi
```

---

## Summary

Phase 1 testing covers:
- ✅ Server-side caching
- ✅ Reflexion auto-trigger
- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling
- ✅ Cache miss handling
- ✅ Batch analysis
- ✅ Type safety

**Total test time:** ~10-15 minutes for complete verification

**Next:** Phase 2 will add automated unit/integration tests
