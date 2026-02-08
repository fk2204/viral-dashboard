# Video Provider Comparison - Quick Reference

## At a Glance

| Provider | Cost/Video | Duration | Quality | Speed | Best For |
|----------|-----------|----------|---------|-------|----------|
| **Luma** | $0.20 | 5-10s | ⭐⭐⭐ Good | Fast | Testing, high-volume economy |
| **Runway** | $1.50 | 20s | ⭐⭐⭐⭐⭐ Studio | Very Fast | Professional production |
| **Veo** | $3.50 | 8s (chain to 148s) | ⭐⭐⭐⭐⭐ 4K | Fastest | Premium + audio needed |
| **Sora** | $3.00 | 25s max | ⭐⭐⭐⭐⭐ Best | Slow | Premium quality only |

---

## Detailed Comparison

### Luma AI Dream Machine 💰 CHEAPEST

**When to use:**
- Initial testing (low cost, low risk)
- High-volume production (100+ videos/day)
- Economy categories (gaming, absurd, food)

**Pros:**
- ✅ Cheapest: $0.20 per video
- ✅ Fast generation: 2-3 minutes
- ✅ API ready now
- ✅ Good enough quality for social media

**Cons:**
- ❌ Shorter duration (5-10s)
- ❌ Lower quality than Runway/Sora
- ❌ May need 2-3 generations for 20s video

**Cost at scale:**
- 10 videos: $2
- 100 videos/day: $600/month
- 1,000 videos/day: $6,000/month

**Setup:** `docs/LUMA_SETUP_GUIDE.md`

---

### Runway Gen-3/4 🎬 RECOMMENDED

**When to use:**
- Professional production
- Client work (agency tier)
- Categories: All (versatile)

**Pros:**
- ✅ Best balance of cost/quality
- ✅ 20-second duration (perfect for TikTok/Shorts)
- ✅ Studio-grade quality (#1 on benchmarks)
- ✅ Very fast (Gen-4 Turbo: 30s for 5s video)
- ✅ Used by Lionsgate, Adobe, Microsoft

**Cons:**
- ❌ 7.5× more expensive than Luma
- ❌ No built-in audio

**Cost at scale:**
- 10 videos: $15
- 100 videos/day: $4,500/month
- 1,000 videos/day: $45,000/month

**Setup:** Requires Runway API key from https://runwayml.com/

---

### Google Veo 3.1 🎵 AUDIO INCLUDED

**When to use:**
- Need synchronized audio (music, voiceover)
- Premium quality required (4K)
- Long videos (can chain to 148s)

**Pros:**
- ✅ Built-in audio (only provider with this)
- ✅ 4K resolution
- ✅ Fastest generation speed
- ✅ Can extend to 148s total

**Cons:**
- ❌ Most expensive: $3.50 per 10s
- ❌ Base clips only 8s (must chain for longer)
- ❌ Still in paid preview (not GA)
- ❌ Regional restrictions apply

**Cost at scale:**
- 10 videos (20s each): $70
- 100 videos/day: $10,500/month
- Not recommended for high-volume due to cost

**Setup:** Requires Google Cloud + Vertex AI setup (complex)

---

### OpenAI Sora 2 🚫 NOT RECOMMENDED

**When to use:**
- Maximum realism required
- Budget not a concern
- Short videos only (<25s)

**Pros:**
- ✅ Best-in-class realism
- ✅ Unmatched physics and narrative
- ✅ 1080p vertical support

**Cons:**
- ❌ 25-second limit (can't do 30-60s TikToks)
- ❌ Expensive: $1-5 per video
- ❌ Slow: 1-3 minute generation
- ❌ 9:16 costs 50% more credits
- ❌ No audio

**Cost at scale:**
- 10 videos: $30
- 100 videos/day: $7,500/month
- Not recommended due to duration limits

---

## Cost Comparison (100 videos/day)

```
Monthly Costs:
┌─────────────────────────────────────┐
│ Luma:     $600   ██                 │
│ Runway:   $4,500 ████████████████   │
│ Sora:     $7,500 █████████████████  │
│ Veo:      $10,500 ████████████████████ │
└─────────────────────────────────────┘

Annual Savings (Luma vs Runway):
$4,500 - $600 = $3,900/month × 12 = $46,800/year
```

---

## Quality vs Cost Matrix

```
Quality
  10 │                    ● Veo (4K + audio)
     │                ● Sora (best realism)
   8 │            ● Runway (studio-grade)
     │
   6 │    ● Luma (good enough)
     │
   4 │
     │
   2 │
     │
   0 └────────────────────────────────────
     $0   $1,000  $5,000  $10,000  Cost/month
```

---

## Recommended Strategy

### Phase 1: Testing (Week 1)
```bash
# Use Luma for all testing
Provider: Luma
Budget: $2 (10 test videos)
Goal: Validate quality score ≥ 7/10
```

### Phase 2: Production (Month 1-3)
```typescript
// Mixed provider strategy
function selectProvider(category: string) {
  if (category === "finance" || category === "tech") {
    return "runway"; // Premium quality for high-value niches
  }
  return "luma"; // Economy for other categories
}

// Average cost: ~$1,200/month (100 videos/day)
```

### Phase 3: Scale (Month 3+)
```typescript
// Optimize based on performance data
if (lumaQualityScore >= 7.5 && lumaEngagementRate >= 0.05) {
  // Luma quality acceptable - use for 90% of videos
  mostVideos = "luma";   // $600/month
  premiumVideos = "runway"; // $450/month (10% of videos)
  totalCost = $1,050/month;
} else {
  // Luma quality insufficient - use Runway
  allVideos = "runway"; // $4,500/month
}
```

---

## When to Upgrade Providers

### Luma → Runway
**Trigger:** Luma quality score < 7/10
**Cost increase:** +$3,900/month
**Benefit:** Professional studio quality

### Runway → Sora
**Trigger:** Client demands maximum realism
**Cost increase:** +$3,000/month
**Benefit:** Best-in-class physics and realism
**Warning:** 25s duration limit problematic

### Any → Veo
**Trigger:** Need built-in audio
**Cost increase:** +$6,000/month (vs Runway)
**Benefit:** Synchronized audio, 4K quality
**Warning:** Must chain 8s clips for longer videos

---

## Provider Selection Logic (Implemented)

```typescript
// From src/lib/video-generation/provider-router.ts

Category Tiers:
- Premium (finance, tech, luxury) → Sora
- Standard (emotional, music, fitness) → Veo
- Economy (gaming, absurd, food) → Luma

Fallback Chains:
- Premium: Sora → Veo → Runway → Luma
- Standard: Veo → Runway → Luma → Sora
- Economy: Luma → Runway → Veo → Sora
```

---

## Real Cost Examples

### Scenario 1: Startup Testing
```
Week 1: Generate 10 test videos
Provider: Luma
Cost: $2
Decision: Quality score 8/10 → Continue with Luma
```

### Scenario 2: SaaS Production (100 users)
```
Month 1: 100 videos/day (3,000/month)
Provider: 90% Luma, 10% Runway
Cost: $600 + $450 = $1,050/month
Revenue: 100 users × $49 = $4,900/month
Profit: $3,850/month (78% margin)
```

### Scenario 3: Agency Scale (1,000 users)
```
Month 6: 500 videos/day (15,000/month)
Provider: All Runway (client quality requirements)
Cost: $22,500/month
Revenue: 1,000 users × $149 = $149,000/month
Profit: $126,500/month (85% margin)
```

---

## Decision Tree

```
Start Here
    |
    ├─ Need to test first? → Luma ($2 for 10 videos)
    |
    ├─ Quality acceptable (≥7/10)?
    |   ├─ YES → Scale with Luma ($600/month)
    |   └─ NO → Switch to Runway ($4,500/month)
    |
    ├─ Need audio? → Veo ($10,500/month)
    |
    ├─ Need max realism? → Sora ($7,500/month)
    |
    └─ Budget constrained? → Luma (always cheapest)
```

---

## Quick Setup Commands

### Luma (Recommended for Testing)
```bash
# 1. Get API key from https://lumalabs.ai/dream-machine/api
# 2. Add to .env.local
echo 'LUMA_API_KEY="luma-..."' >> .env.local

# 3. Test setup
bash tests/scripts/test-luma.sh

# 4. Generate video
curl -X POST http://localhost:3000/api/video/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"conceptId": "...", "platform": "tiktok", "provider": "luma"}'
```

### Runway (Production Quality)
```bash
# 1. Get API key from https://runwayml.com/
# 2. Add to .env.local
echo 'RUNWAY_API_KEY="..."' >> .env.local

# 3. Generate video
curl -X POST http://localhost:3000/api/video/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"conceptId": "...", "platform": "tiktok", "provider": "runway"}'
```

---

## Summary

**For testing:** Use **Luma** ($0.20/video)
- Low risk, low cost
- Good enough quality for validation
- Total test cost: $2 (10 videos)

**For production:** Depends on quality requirements
- Quality needed ≥ 8/10 → **Runway** ($1.50/video)
- Budget constrained + quality ≥ 7/10 → **Luma** ($0.20/video)
- Need audio → **Veo** ($3.50/video)

**Bottom line:** Start with Luma, upgrade to Runway if quality insufficient.

**Expected path:**
1. Week 1: Test with Luma ($2)
2. Week 2-4: Scale with Luma if quality ≥ 7/10 ($600/month)
3. Month 2+: Mix Luma (economy) + Runway (premium) (~$1,200/month)
4. Month 6+: All Runway if client demands increase ($4,500/month)

**Key metric:** Quality score (from QUALITY_TESTING_GUIDE.md)
- 7+/10 → Luma acceptable
- <7/10 → Upgrade to Runway
