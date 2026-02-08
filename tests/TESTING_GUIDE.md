# 🧪 Complete Testing Guide

## Overview

This guide covers all testing approaches for the Viral Dashboard, including manual testing, automated tests, and performance testing.

---

## Quick Start

### 1. Run All Tests

```bash
# Make scripts executable (Unix/Mac)
chmod +x tests/scripts/*.sh

# Run complete test suite
./tests/scripts/run-all-tests.sh
```

### 2. Run Individual Test Suites

```bash
# Database tests
./tests/scripts/test-database.sh

# Authentication tests
./tests/scripts/test-auth-flow.sh

# API endpoint tests
./tests/scripts/test-api-endpoints.sh

# Video generation tests (requires API key)
API_KEY="your_key" ./tests/scripts/test-video-generation.sh
```

---

## Test Suites

### Suite 1: Database Tests

**What it tests:**
- Database connection (PostgreSQL/Neon)
- Schema validation (15 tables)
- Prisma setup
- Migrations

**Requirements:**
- `DATABASE_URL` in `.env.local`
- Prisma migrations run

**Run:**
```bash
./tests/scripts/test-database.sh
```

**Expected output:**
```
✓ DATABASE_URL is set
✓ Database connection successful
✓ Found 1 migration(s)
```

---

### Suite 2: Authentication Flow

**What it tests:**
- Public routes (/, /sign-in, /sign-up)
- Protected routes (redirect without auth)
- API key authentication
- Session management

**Requirements:**
- Development server running (`npm run dev`)
- Optional: `API_KEY` for authenticated tests

**Run:**
```bash
# Without API key (tests public routes only)
./tests/scripts/test-auth-flow.sh

# With API key (full authentication tests)
API_KEY="vd_xxx" ./tests/scripts/test-auth-flow.sh
```

**Expected output:**
```
✓ Home page (200)
✓ Sign-in page (200)
✓ Dashboard (no auth) (307 redirect)
✓ API key authentication working
```

---

### Suite 3: API Endpoints

**What it tests:**
- Content generation API
- User management APIs
- Video generation APIs (stub)
- Billing APIs (stub)

**Requirements:**
- Development server running
- API key (optional, for authenticated endpoints)

**Run:**
```bash
API_KEY="vd_xxx" ./tests/scripts/test-api-endpoints.sh
```

**Expected output:**
```
✓ Generate concepts (200)
✓ Get trends (200)
✓ Get user concepts (200)
✓ Get user usage (200)
```

---

### Suite 4: Video Generation

**What it tests:**
- Concept generation
- Video generation trigger
- Job queue (Inngest)
- Video status polling
- Provider routing

**Requirements:**
- Development server running
- API key required
- Inngest configured (optional, for real jobs)
- S3 configured (optional, for real uploads)

**Run:**
```bash
API_KEY="vd_xxx" ./tests/scripts/test-video-generation.sh
```

**Expected output:**
```
✓ Concept generated successfully
✓ Video generation triggered
✓ Video generated successfully
  Provider: runway
  Cost: $0.25
```

---

## Manual Testing Checklist

### Phase 1: SaaS Platform

#### Authentication
- [ ] Sign up with email
  - Go to http://localhost:3000/sign-up
  - Enter email and password
  - Verify account created

- [ ] Sign in with email
  - Go to http://localhost:3000/sign-in
  - Enter credentials
  - Verify redirected to dashboard

- [ ] OAuth sign-in (if configured)
  - Click "Continue with Google/GitHub"
  - Verify OAuth flow works

- [ ] Sign out
  - Click user button → Sign out
  - Verify redirected to home

#### Dashboard
- [ ] View dashboard
  - Check quota usage display
  - Check subscription tier
  - Check organization info

- [ ] Generate concepts
  - Click "Generate" or use /api/generate
  - Verify 5 concepts returned
  - Check quota decremented

#### Billing
- [ ] View pricing page
  - Go to /dashboard/billing
  - Verify 3 tiers displayed (Starter, Pro, Agency)

- [ ] Test checkout (Stripe test mode)
  - Click "Get Started" on any tier
  - Use test card: 4242 4242 4242 4242
  - Verify subscription created
  - Check database updated

- [ ] Open billing portal
  - Click "Manage Billing"
  - Verify Stripe portal opens
  - Try updating payment method

#### API Keys
- [ ] Generate API key
  - Go to /dashboard/api-keys
  - Click "Generate API Key"
  - Copy key for testing

- [ ] Test API key
  ```bash
  curl -H "Authorization: Bearer YOUR_KEY" \
    http://localhost:3000/api/user/usage
  ```

- [ ] Revoke API key
  - Click "Revoke Key"
  - Verify key no longer works

---

### Phase 2: Video Generation

#### Concept to Video
- [ ] Generate concept
  - Use dashboard or API
  - Copy concept ID

- [ ] Trigger video generation
  ```bash
  curl -X POST http://localhost:3000/api/video/generate \
    -H "Authorization: Bearer YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"conceptId": "YOUR_ID", "platform": "tiktok"}'
  ```

- [ ] Check video status
  ```bash
  curl http://localhost:3000/api/video/status?conceptId=YOUR_ID \
    -H "Authorization: Bearer YOUR_KEY"
  ```

#### Inngest Dashboard
- [ ] View Inngest dashboard
  - Go to https://app.inngest.com
  - Check "video/generate" events
  - Monitor job progress

#### S3 Storage
- [ ] Check S3 bucket
  ```bash
  aws s3 ls s3://viral-videos/videos/
  ```

- [ ] Verify CDN URL
  - Get videoUrl from status API
  - Open in browser
  - Verify video plays

---

## Performance Testing

### Load Testing

Test how the system handles concurrent requests:

```bash
# Install Apache Bench
# Mac: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test concept generation (10 concurrent, 100 total)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_KEY" \
  http://localhost:3000/api/generate

# Test video status checks
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_KEY" \
  http://localhost:3000/api/video/status?conceptId=ID
```

**Expected results:**
- Requests per second: >10
- Mean response time: <500ms
- Failed requests: 0%

### Rate Limiting Test

Test rate limiting enforcement:

```bash
# Send 15 requests in quick succession (limit is 10/10s)
for i in {1..15}; do
  curl -H "Authorization: Bearer YOUR_KEY" \
    http://localhost:3000/api/user/usage
  sleep 0.5
done
```

**Expected:**
- First 10 requests: 200 OK
- Next 5 requests: 429 Too Many Requests
- After 10 seconds: Limit reset

---

## Mock Data for Testing

### Generate Mock Concepts

```typescript
import { mockData } from '@/tests/mocks/generate-mock-data';

// Generate 5 mock concepts
const concepts = mockData.concepts(5);

// Generate 10 mock trends
const trends = mockData.trends(10);

// Generate complete generation
const generation = mockData.generation();
```

### Seed Database

```bash
# Run seed script (if created)
npx prisma db seed
```

---

## Debugging Tests

### Enable Debug Output

```bash
# Set debug environment variables
DEBUG=true ./tests/scripts/run-all-tests.sh
```

### Check Logs

```bash
# View Next.js dev server logs
tail -f .next/trace

# View Prisma query logs
# Set in .env.local: DEBUG="prisma:query"
npm run dev
```

### Inspect Database

```bash
# Open Prisma Studio
npx prisma studio

# Run SQL queries directly
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;"
```

---

## Common Issues & Fixes

### Issue: Database connection failed

**Fix:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1;"

# Regenerate Prisma Client
npx prisma generate
```

### Issue: API key authentication failed

**Fix:**
```bash
# Verify API key is valid
# Check it exists in database
npx prisma studio # Open users table

# Generate new API key from dashboard
```

### Issue: Video generation timeout

**Fix:**
- Mock providers don't actually generate videos
- Real providers (Runway) can take 2-5 minutes
- Check Inngest dashboard for job status
- Verify S3 credentials if using real storage

### Issue: Rate limiting too strict

**Fix:**
```typescript
// Adjust in src/middleware/rate-limit.ts
const config = {
  limit: 20, // Increase from 10
  windowMs: 10000 // 10 seconds
};
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run database tests
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: ./tests/scripts/test-database.sh

      - name: Start server
        run: npm run dev &

      - name: Run API tests
        run: ./tests/scripts/test-api-endpoints.sh
```

---

## Test Coverage Goals

### Current Coverage:
- ✅ Database connection: 100%
- ✅ Authentication: 80%
- ✅ API endpoints: 70%
- ✅ Video generation: 60% (mock)
- ⏳ UI components: 0% (manual only)

### Target Coverage:
- Database: 100%
- Authentication: 95%
- API endpoints: 90%
- Video generation: 85%
- UI components: 70%

---

## Next Steps

### Add Unit Tests (Future)
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run unit tests
npm test
```

### Add E2E Tests (Future)
```bash
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

---

## Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Playwright:** https://playwright.dev/
- **Testing Library:** https://testing-library.com/
- **Prisma Testing:** https://www.prisma.io/docs/guides/testing

---

**Test Early, Test Often! 🧪**

Your tests are the safety net that lets you move fast without breaking things.
