# 🎬 Luma AI Setup Guide

## Why Luma?

**Luma AI Dream Machine** is the most cost-effective option for video generation:

- ✅ **Cheapest:** ~$0.20 per video (vs $1-5 for competitors)
- ✅ **Fast:** 2-3 minute generation time
- ✅ **Good quality:** Professional-grade output suitable for social media
- ✅ **API ready:** Production API available now
- ✅ **Perfect for testing:** Low cost means you can test extensively

**Cost Comparison:**
- Luma: $0.20/video → 100 videos = $20
- Runway: $1.50/video → 100 videos = $150
- Sora: $3.00/video → 100 videos = $300

---

## Step 1: Get Luma API Key

### Option A: Official Luma API (Recommended)

1. Go to [https://lumalabs.ai/dream-machine](https://lumalabs.ai/dream-machine)
2. Click "Sign Up" or "Log In"
3. Navigate to API section: [https://lumalabs.ai/dream-machine/api](https://lumalabs.ai/dream-machine/api)
4. Click "Get API Key" or "Create API Key"
5. Copy your API key (starts with `luma-...`)

**Pricing:**
- Pay-as-you-go: $0.32 per million pixels
- ~$0.20-$0.30 per 8-second vertical video

### Option B: PiAPI (Alternative - 60% cheaper)

If Luma's official API is unavailable or expensive:

1. Go to [https://piapi.ai](https://piapi.ai)
2. Sign up for an account
3. Navigate to Luma AI integration
4. Pricing: $0.20 per generation (fixed, cheaper)

**Note:** For this guide, we'll use the official Luma API. PiAPI integration requires different endpoints.

---

## Step 2: Configure Environment

Add your Luma API key to `.env.local`:

```env
# Luma AI Dream Machine
LUMA_API_KEY="luma-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Important:**
- Replace `luma-xxxxxxxx` with your actual API key
- Keep your API key secret (never commit to git)
- The key should start with `luma-`

---

## Step 3: Verify Setup

Run the setup validation script:

```bash
bash tests/scripts/test-luma.sh
```

**Expected output:**
```
🎬 Testing Luma AI Video Generation...

✓ LUMA_API_KEY configured
✓ API key valid and working

==========================================
LUMA SETUP VALIDATION
==========================================
✅ Luma AI is ready for testing
```

**If you see errors:**
- ❌ "LUMA_API_KEY not found" → Add key to `.env.local`
- ❌ "Invalid API key" → Check your key is correct (copy again from Luma)
- ❌ "API connection failed" → Check internet connection, try again

---

## Step 4: Test Video Generation

### Generate a Test Concept

First, create a concept to turn into a video:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" | jq '.'
```

**Copy the `conceptId` from the response** (e.g., `concept_abc123`)

### Generate Video with Luma

Trigger video generation using Luma provider:

```bash
curl -X POST http://localhost:3000/api/video/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "concept_abc123",
    "platform": "tiktok",
    "provider": "luma"
  }' | jq '.'
```

**Expected response:**
```json
{
  "success": true,
  "jobId": "job_xyz789",
  "message": "Video generation started with Luma AI"
}
```

### Check Generation Status

Poll for completion (takes 2-3 minutes):

```bash
# Check status
curl http://localhost:3000/api/video/status?conceptId=concept_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" | jq '.'
```

**Status responses:**
- `"generating"` → Still processing, wait 30 seconds and check again
- `"completed"` → Done! Video ready
- `"failed"` → Error occurred, check logs

**Auto-polling script:**
```bash
CONCEPT_ID="concept_abc123"
API_KEY="YOUR_API_KEY"

while true; do
  STATUS=$(curl -s http://localhost:3000/api/video/status?conceptId=$CONCEPT_ID \
    -H "Authorization: Bearer $API_KEY" | jq -r '.status')

  echo "[$(date +%H:%M:%S)] Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo "✅ Video ready!"
    curl -s http://localhost:3000/api/video/status?conceptId=$CONCEPT_ID \
      -H "Authorization: Bearer $API_KEY" | jq '.videoUrl'
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Generation failed"
    break
  fi

  sleep 30
done
```

### Download and Review Video

Once completed, get the video URL and download:

```bash
VIDEO_URL=$(curl -s http://localhost:3000/api/video/status?conceptId=concept_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" | jq -r '.videoUrl')

# Download video
curl -o test_luma_video.mp4 "$VIDEO_URL"

# Open video (platform-specific)
# Windows:
start test_luma_video.mp4

# Mac:
open test_luma_video.mp4

# Linux:
xdg-open test_luma_video.mp4
```

---

## Step 5: Quality Assessment

Use the quality scoring system from `QUALITY_TESTING_GUIDE.md`:

### Technical Quality (Pass/Fail)
- [ ] Aspect ratio: 9:16 (vertical)
- [ ] Duration: 5-10 seconds
- [ ] Resolution: Clear (720p+)
- [ ] No black frames or glitches
- [ ] File size: <100MB

### Visual Quality (1-10)
- Motion smoothness: ___/10
- Lighting: ___/10
- Professional look: ___/10
- AI artifacts: ___/10

### Hook Effectiveness (1-10)
- First 3 seconds compelling: ___/10
- Would you keep watching: ___/10
- Clear value proposition: ___/10

### Overall Score: ___/10

**Decision:**
- 8-10: ✅ Excellent - Luma quality sufficient for production
- 6-7: ⚠️ Good - Acceptable, but monitor quality
- 4-5: ⚠️ Mediocre - Consider Runway for better quality
- 1-3: ❌ Poor - Switch to Runway or Sora

---

## Cost Tracking

### Test Phase (First 10 Videos)
```
Cost per video: $0.20
Total cost: 10 × $0.20 = $2.00
```

### Production Scale (100 videos/day)
```
Daily cost: 100 × $0.20 = $20
Monthly cost: $20 × 30 = $600
```

**Comparison:**
- Luma: $600/month (100 videos/day)
- Runway: $4,500/month (100 videos/day)
- **Savings:** $3,900/month with Luma

---

## Troubleshooting

### Problem: "LUMA_API_KEY not configured"

**Solution:**
```bash
# Check if .env.local exists
ls -la .env.local

# If missing, create it
cp .env.example .env.local

# Add your key
echo 'LUMA_API_KEY="luma-your-key-here"' >> .env.local
```

### Problem: "Invalid API key"

**Solution:**
1. Log in to Luma dashboard
2. Regenerate API key
3. Copy the new key
4. Update `.env.local` with new key
5. Restart your dev server: `npm run dev`

### Problem: "Generation timeout"

**Possible causes:**
- Luma API is experiencing high load
- Internet connection interrupted
- Prompt too complex

**Solution:**
1. Wait 5 minutes and retry
2. Simplify the prompt (shorter description)
3. Check Luma API status: https://status.lumalabs.ai (if exists)

### Problem: "Video quality poor (< 6/10)"

**Solution:**
```bash
# Try with a different category
# Finance/Tech → Better prompts → Higher quality

# Or upgrade to Runway for better quality
# Update provider in request:
{
  "conceptId": "concept_abc123",
  "platform": "tiktok",
  "provider": "runway"  # Instead of "luma"
}
```

---

## Cost Optimization Strategy

### Phase 1: Testing (Week 1)
- Generate 10 test videos with Luma ($2 total)
- Assess quality score
- If score ≥ 7/10 → Continue with Luma
- If score < 7/10 → Switch to Runway

### Phase 2: Mixed Strategy (Month 1-3)
```typescript
// Use Luma for economy categories
Economy categories (gaming, absurd): Luma ($0.20)
Standard categories (fitness, music): Runway ($1.50)
Premium categories (finance, tech): Sora ($3.00)

Average cost per video: ~$1.00
```

### Phase 3: Scale (Month 3+)
- If Luma quality acceptable → Use Luma for 80% of videos
- Reserve Runway/Sora for premium clients or top-performing categories
- Monitor quality scores monthly

---

## API Rate Limits

**Luma API Limits:**
- No public rate limit documentation available
- Conservative estimate: 60 requests/minute
- For 100 videos/day: Well within limits

**Best practices:**
- Stagger generation requests (don't submit 100 at once)
- Use Inngest job queue to throttle (already implemented)
- Monitor for 429 rate limit errors

---

## Next Steps

1. ✅ **Complete setup** - Get API key, configure .env.local
2. ✅ **Run validation** - `bash tests/scripts/test-luma.sh`
3. ✅ **Generate test video** - Follow Step 4 above
4. ✅ **Assess quality** - Score using quality framework
5. 🎯 **Make decision:**
   - Quality ≥ 7/10 → Scale with Luma (save $3,900/month)
   - Quality < 7/10 → Get Runway API key instead

---

## Support

**Luma AI Documentation:**
- API Docs: https://docs.lumalabs.ai (if available)
- Pricing: https://lumalabs.ai/dream-machine/api/pricing
- Support: support@lumalabs.ai

**Your Dashboard:**
- Video generation logs: Check server console output
- Database: `npx prisma studio` → videos table
- Error tracking: Check `videos.errorMessage` field

---

## Summary

✅ **Luma is the cheapest option** - Perfect for testing and high-volume production
✅ **Quick setup** - Just add API key to .env.local
✅ **Real cost data** - $0.20/video confirmed by research
✅ **Production ready** - Official API available now

**Total setup time:** 10 minutes
**First video cost:** $0.20
**Decision point:** After 10 test videos ($2 total) - keep Luma or upgrade to Runway based on quality

Good luck! 🚀
