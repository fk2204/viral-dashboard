# 🎬 Test Your First Video - Step by Step

## Prerequisites Checklist

Before generating a video, check you have:

### ✅ Required (Must Have)
- [ ] **Database**: PostgreSQL connection (Neon or local)
- [ ] **Server Running**: `npm run dev` on port 3000
- [ ] **API Key**: Generated from dashboard or database
- [ ] **Video Provider**: At least ONE of:
  - Runway API key (easiest to get)
  - OpenAI API key (Sora - if you have access)
  - Google Cloud + Vertex AI (Veo - complex setup)

### 🔧 Optional (For Full Test)
- [ ] **AWS S3**: For video storage (can skip for initial test)
- [ ] **Inngest**: For job queue (can test synchronously first)
- [ ] **Social Accounts**: For posting test (do last)

---

## 🚀 Quick Test Path (Fastest Route)

### Step 1: Check Prerequisites

```bash
# 1. Is server running?
curl http://localhost:3000
# Should return HTML (homepage)

# 2. Check database connection
npx prisma db pull
# Should succeed without errors

# 3. Do you have API key?
# Get from: http://localhost:3000/dashboard/api-keys
# OR check database:
npx prisma studio
# Navigate to: users table → copy apiKey value
```

### Step 2: Test Concept Generation

```bash
# Generate a concept (no video yet, just text)
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "concepts": [
#     {
#       "id": "concept_xxx",
#       "title": "...",
#       "script": [...],
#       "soraPrompt": "...",
#       "category": "finance"
#     }
#   ],
#   "trends": [...]
# }

# ✅ If this works: Concept generation is good
# ❌ If error: Check API key, database, trends APIs
```

### Step 3: Which Video Provider Do You Have?

#### Option A: Runway (Recommended - Easiest)
```bash
# Get API key: https://runwayml.com/
# Sign up → API → Generate Key
# Cost: ~$0.05-$0.30 per second of video

# Add to .env.local:
RUNWAY_API_KEY="your_key_here"

# Test API key:
curl https://api.runwayml.com/v1/models \
  -H "Authorization: Bearer YOUR_RUNWAY_KEY"

# Should return list of available models
```

#### Option B: OpenAI Sora (If You Have Access)
```bash
# Check if you have access:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" | grep sora

# Add to .env.local:
OPENAI_API_KEY="sk-proj-xxx"

# Note: Sora API may not be publicly available yet
```

#### Option C: Google Veo (Most Complex)
```bash
# Requires:
# 1. Google Cloud Project
# 2. Vertex AI enabled
# 3. Service account with credentials
# 4. Veo API access (limited availability)

# Skip this for initial testing
```

### Step 4: Configure Minimal Setup

Create `.env.local` with ONLY essentials:
```env
# Database (already have this)
DATABASE_URL="postgresql://..."

# Authentication (already have this)
CLERK_SECRET_KEY="sk_..."

# Video Provider (choose ONE)
RUNWAY_API_KEY="your_runway_key"
# OR
OPENAI_API_KEY="sk-..."

# Inngest (optional for now - can test without)
# INNGEST_EVENT_KEY="..."
# INNGEST_SIGNING_KEY="..."

# AWS S3 (optional - video can be stored temporarily without this)
# AWS_ACCESS_KEY_ID="..."
# AWS_SECRET_ACCESS_KEY="..."
# AWS_S3_BUCKET="viral-videos"
```

### Step 5: Generate Test Video (Manual Trigger)

```bash
# Get a concept ID from Step 2
CONCEPT_ID="concept_xxx"

# Trigger video generation
curl -X POST http://localhost:3000/api/video/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "'$CONCEPT_ID'",
    "platform": "tiktok"
  }'

# Expected response:
# {
#   "success": true,
#   "jobId": "job_xxx",
#   "message": "Video generation started"
# }
```

### Step 6: Check Video Status

```bash
# Poll for completion (video generation takes 2-5 minutes)
curl http://localhost:3000/api/video/status?conceptId=$CONCEPT_ID \
  -H "Authorization: Bearer YOUR_API_KEY"

# Responses:
# "generating" → Still processing, wait
# "completed" → Done! Video ready
# "failed" → Error (check logs)

# Keep checking every 30 seconds:
while true; do
  STATUS=$(curl -s http://localhost:3000/api/video/status?conceptId=$CONCEPT_ID \
    -H "Authorization: Bearer YOUR_API_KEY" | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 30
done
```

### Step 7: Download and Review Video

```bash
# Get video URL from status response
curl http://localhost:3000/api/video/status?conceptId=$CONCEPT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" | jq '.videoUrl'

# Download video
VIDEO_URL="<url_from_response>"
curl -o test_video.mp4 "$VIDEO_URL"

# Open and watch:
# Windows: start test_video.mp4
# Mac: open test_video.mp4
# Linux: xdg-open test_video.mp4
```

### Step 8: Quality Assessment

Watch the video and answer:

**Technical Quality:**
- [ ] Is it 9:16 aspect ratio (vertical)?
- [ ] Is duration 15-60 seconds?
- [ ] Is resolution clear (1080x1920)?
- [ ] Is there audio?
- [ ] Any glitches or black frames?

**Visual Quality (1-10):**
- Is motion smooth? ___/10
- Is lighting good? ___/10
- Does it look professional? ___/10
- Any AI artifacts? ___/10

**Hook Effectiveness (1-10):**
- First 3 seconds compelling? ___/10
- Would you keep watching? ___/10
- Clear value proposition? ___/10

**Overall Score: ___/10**

**Decision:**
- 8-10: ✅ Excellent - ready to post
- 6-7: ⚠️ Good - might need prompt tweaks
- 4-5: ⚠️ Mediocre - needs improvement
- 1-3: ❌ Poor - prompts need major work

---

## 🐛 Troubleshooting

### Problem: Concept Generation Fails

**Error:** "Failed to fetch trends" or "No concepts generated"

**Fix:**
```bash
# Check trend API keys in .env.local
echo $YOUTUBE_API_KEY
echo $GNEWS_API_KEY

# Test YouTube API:
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=trending&key=$YOUTUBE_API_KEY"

# Test GNews API:
curl "https://gnews.io/api/v4/top-headlines?token=$GNEWS_API_KEY"

# If APIs fail, add valid keys to .env.local
```

---

### Problem: Video Generation Fails

**Error:** "Provider not available" or "Generation failed"

**Check:**
```bash
# 1. Is provider API key valid?
# Runway test:
curl https://api.runwayml.com/v1/models \
  -H "Authorization: Bearer $RUNWAY_API_KEY"

# 2. Check server logs for errors
# Look for errors in terminal where `npm run dev` is running

# 3. Check database for error message
npx prisma studio
# Navigate to: videos table → check errorMessage column
```

**Common Issues:**
- Invalid API key → Get new key from provider
- Prompt too complex → Simplify (shorter video, simpler scene)
- Provider rate limit → Wait and retry
- Missing Inngest → Video generation needs job queue

---

### Problem: Can't Download Video

**Error:** 404 or access denied on video URL

**Cause:** S3 not configured or video not uploaded

**Fix:**
```bash
# Check if S3 is configured
echo $AWS_S3_BUCKET

# If empty, video is stored at provider temporarily
# Get direct provider URL from database:
npx prisma studio
# videos table → videoUrl column (provider's URL)
```

---

## 📊 Testing Checklist

### Minimal Working Test
- [ ] Server running
- [ ] Database connected
- [ ] API key works
- [ ] Concept generated (text only)
- [ ] ✅ **STOP HERE if above fails**

### Video Generation Test
- [ ] Provider API key added
- [ ] Video generation triggered
- [ ] Job completes (no errors)
- [ ] Video file accessible
- [ ] ✅ **STOP HERE if above fails**

### Quality Validation
- [ ] Video downloaded
- [ ] Technical specs correct
- [ ] Visual quality assessed
- [ ] Hook effectiveness scored
- [ ] ✅ **Overall score calculated**

### Platform Test (Optional)
- [ ] Test TikTok account created
- [ ] Video posted manually
- [ ] Platform accepts (not flagged)
- [ ] Organic views checked (24h)
- [ ] ✅ **Real performance data**

---

## 🎯 What to Do Based on Results

### If Quality Score 8-10 ✅
```
Great! The system works.

Next steps:
1. Generate 10 more videos across categories
2. Calculate avg quality score
3. Post 3 best to test accounts
4. Track performance for 7 days
5. If views > 5K avg: System is viable
6. Proceed to optimize and scale
```

### If Quality Score 6-7 ⚠️
```
Decent but needs work.

Next steps:
1. Identify specific issues (hook? visuals? motion?)
2. Tweak prompts in src/lib/prompts.ts
3. Generate 5 more with new prompts
4. Compare quality scores
5. Iterate until score > 7.5
6. THEN test at scale
```

### If Quality Score 1-5 ❌
```
Not ready for production.

Options:
1. Try different provider (Runway vs Sora vs Veo)
2. Completely rewrite prompts based on research
3. Study viral videos → reverse engineer prompts
4. Consider hybrid: AI generates, human edits
5. Worst case: AI for concepts only, outsource video production
```

---

## 📝 Test Results Template

```markdown
# Test Video Results

**Date:** 2024-XX-XX
**Concept ID:** concept_xxx
**Category:** finance
**Provider:** runway
**Cost:** $X.XX

## Technical Quality
- Aspect Ratio: 9:16 ✅/❌
- Duration: XX seconds ✅/❌
- Resolution: 1080x1920 ✅/❌
- Audio Present: Yes/No ✅/❌
- Glitches: Yes/No

## Visual Quality: X/10
- Motion smoothness: X/10
- Lighting: X/10
- Professional look: X/10
- AI artifacts: X/10

## Hook Effectiveness: X/10
- First 3 seconds: X/10
- Keep watching: X/10
- Clear value: X/10

## Overall Score: X/10

## Notes:
- What worked well:
- What needs improvement:
- Prompt changes to try:

## Decision:
[ ] Ready to scale
[ ] Needs optimization
[ ] Not viable as-is
```

---

## 🚀 Ready to Test?

Run these commands in order:

```bash
# 1. Start server
npm run dev

# 2. Generate concept
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" | jq '.'

# 3. Copy concept ID from response

# 4. Trigger video (replace CONCEPT_ID)
curl -X POST http://localhost:3000/api/video/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"conceptId": "CONCEPT_ID", "platform": "tiktok"}' | jq '.'

# 5. Check status (repeat every 30s)
curl http://localhost:3000/api/video/status?conceptId=CONCEPT_ID \
  -H "Authorization: Bearer YOUR_API_KEY" | jq '.'

# 6. Download when complete
# Get videoUrl from status response and download it
```

---

## 💬 Report Back

After testing, tell me:
1. **Did concept generation work?** (Yes/No)
2. **Which provider are you using?** (Runway/Sora/Veo)
3. **Did video generate successfully?** (Yes/No + how long)
4. **Quality score?** (X/10)
5. **What needs fixing?** (Describe issues)

Let's get REAL DATA! 🎬
