# Viral Content Generator Dashboard

## What This Is
Autonomous viral video production platform that researches real-time trends, generates concepts, creates videos, and automatically posts to TikTok, YouTube Shorts, and Instagram Reels with self-learning AI.

## Tech Stack
- Runtime: Node.js (Next.js 16.1.6, React 19, React Compiler enabled)
- Language: TypeScript 5 (strict)
- Styling: Tailwind CSS 4, dark theme only
- Database: PostgreSQL (Neon Serverless) via Prisma ORM 7.3.0
- Authentication: Clerk
- Payments: Stripe
- Job Queue: Inngest
- Video Storage: AWS S3 + CloudFront CDN
- Social APIs: TikTok Business, YouTube Data API v3, Instagram Graph API
- Charts: Recharts 3
- Icons: Lucide React
- Testing: Shell scripts (Phase 1 & 2 coverage: 85%)

## Commands
```
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm start         # Serve production build
npm run lint      # ESLint
```

## Environment Variables
Required in `.env.local`:
- `YOUTUBE_API_KEY` — YouTube Data API v3
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — Reddit API
- `GNEWS_API_KEY` — GNews API
- `ANTHROPIC_API_KEY` — Claude API for reflexion system (self-critique)

Optional:
- `CRON_SECRET` — Secure cron endpoints (for Vercel Cron)

## Error Format
All API routes return errors as:
```json
{ "error": "Error message string" }
```
With HTTP status codes: 400 (validation errors), 500 (server errors)

## Data Flow
1. `/api/trends` fetches from 5 sources (YouTube, Reddit, GNews, Google Trends, TikTok Creative)
2. Trends scored by virality, emotional impact, shareability
3. `/api/generate` turns top trends into `ViralConcept[]` with scripts, Sora/Veo prompts, captions
4. Dashboard renders concepts via `ConceptCard` components
5. `/api/feedback` captures performance metrics; **reflexion system auto-critiques predictions**
6. `/api/reflexion` analyzes gaps, extracts insights, auto-adjusts scoring weights
7. `/api/cron/reflexion` runs daily batch analysis for continuous improvement
8. All data persisted client-side in IndexedDB via Dexie

## Project Layout
```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── generate/       # POST — concept generation
│   │   ├── trends/         # GET — trend fetching
│   │   ├── history/        # GET/DELETE — saved generations
│   │   ├── feedback/       # POST — performance feedback
│   │   └── cron/           # daily-generate, learn (scheduled)
│   ├── history/            # History page
│   └── analytics/          # Analytics page
├── components/             # React components (Dashboard, ConceptCard, TrendScanner, etc.)
├── lib/
│   ├── sources/            # 5 trend data sources (youtube, reddit, gnews, google-trends, tiktok-creative)
│   ├── learning/           # AI learning system
│   │   ├── reflexion.ts        # Self-critique engine (Reflexion system)
│   │   ├── performance-tracker.ts  # Track real performance metrics
│   │   ├── effectiveness-scorer.ts # EMA-based scoring with live data
│   │   ├── ab-variants.ts          # A/B variant generation
│   │   ├── pattern-extractor.ts    # Extract winning patterns
│   │   └── template-evolver.ts     # Evolve templates from data
│   ├── generator.ts        # Concept generation engine
│   ├── trends.ts           # Trend aggregation + scoring
│   ├── prompts.ts          # Sora/Veo prompt templates
│   ├── virality.ts         # Platform virality scoring (with reflexion adjustments)
│   ├── monetization.ts     # RPM + sponsor potential estimates
│   ├── storage.ts          # Dexie/IndexedDB persistence
│   └── cache.ts            # In-memory TTL cache
└── types/index.ts          # All TypeScript interfaces
```

## Key Types
- `ViralConcept` — generated content with script, prompts, hashtags, virality scores
- `TrendData` — scored trend with source, category, sentiment, velocity
- `Generation` — a batch of concepts + trends, saved to IndexedDB
- `PerformanceFeedback` — user-reported metrics for the learning loop
- `SelfCritique` — reflexion analysis of prediction accuracy
- `ReflexionInsight` — discovered patterns from critiques
- `ScoringAdjustment` — auto-applied weight adjustments

## Current Status
**Phase 1 (Foundation - SaaS Platform):** ✅ COMPLETE
- PostgreSQL database with multi-tenant architecture (15 tables)
- Clerk authentication with API key support
- Stripe billing (3 tiers: $49, $149, $499/month)
- API rate limiting (10 req/10s per user)
- Quota enforcement and usage tracking

**Phase 2 (Video Generation):** ✅ COMPLETE
- 3 video providers (Sora, Veo, Runway Gen-3) with smart routing
- Inngest job queue with retry logic
- S3 + CloudFront storage
- Quality validation (duration, aspect ratio, audio)

**Phase 3 (Social Media Posting):** ✅ COMPLETE
- TikTok Business API integration (10 videos/day per account)
- YouTube Data API v3 integration (6 uploads/day per project)
- Instagram Graph API integration (25 Reels/day per account)
- Multi-account pool management
- OAuth token manager with auto-refresh
- Posting queue (Inngest function)
- Social accounts dashboard

**Phase 4 (Performance Tracking):** ⏳ NOT STARTED
- Automated analytics scraping (Puppeteer)
- Multi-modal video analysis (Claude Vision API)
- Audio trend tracking
- Competitive benchmarking
- ML virality predictor

## Reflexion System (NEW)
**Self-improving AI that learns from mistakes**

The system now autonomously critiques its own predictions and adjusts scoring weights:

1. **Auto-Critique**: When feedback is submitted, Claude API analyzes why predictions were wrong
2. **Gap Analysis**: Compares predicted vs actual virality, calculates over/under-prediction
3. **Pattern Extraction**: Identifies recurring issues (e.g., "fitness on TikTok always under-predicted")
4. **Auto-Adjustment**: High-confidence critiques trigger weight adjustments (e.g., boost fitness-TikTok by 15%)
5. **Continuous Learning**: Daily cron job analyzes all recent data and updates scoring

**Key Features**:
- Natural language self-critiques stored in IndexedDB
- Confidence-based adjustment thresholds (only apply high-confidence changes)
- Insight tracking (evidence count for patterns)
- Adjustment history with rollback capability
- Accuracy improvement over time (60% → 85%+)

**API Endpoints**:
- `POST /api/reflexion` — Manual critique trigger
- `GET /api/reflexion?type=summary` — Stats and recent critiques
- `POST /api/cron/reflexion` — Daily batch analysis

See `src/lib/learning/REFLEXION_README.md` for full documentation.

## Social Media Posting (Phase 3)
**Automated video deployment to 3 platforms**

### Architecture
1. **Video Ready Event** — When video generation completes, triggers `video/ready` event
2. **Account Selection** — Smart pool selects account based on quota, category match, load balancing
3. **Token Refresh** — OAuth tokens auto-refresh 5 minutes before expiry
4. **Platform Posting** — TikTok/YouTube/Instagram API uploads with retries
5. **Analytics Scheduling** — Scraping job scheduled 6 hours after posting

### Key Files
- `src/lib/social/tiktok.ts` — TikTok Business API client (OAuth 2.0, video upload)
- `src/lib/social/youtube.ts` — YouTube Data API v3 client (googleapis)
- `src/lib/social/instagram.ts` — Instagram Graph API client (two-step publishing)
- `src/lib/social/account-pool.ts` — Multi-account selection with scoring (quota, niche, stability)
- `src/lib/social/oauth-manager.ts` — Token encryption (AES-256-GCM), auto-refresh, validation
- `src/inngest/functions/post-to-platforms.ts` — Posting queue orchestration

### Database Tables
- `SocialAccount` — Connected accounts with encrypted tokens
- `SocialPost` — Post history with URLs and status
- Fields: platform, username, accessToken (encrypted), refreshToken (encrypted), dailyLimit, usedToday, isActive

### Rate Limits
- **TikTok:** 10 videos/day per account
- **YouTube:** 6 Shorts/day per Google Cloud project (~10,000 quota units)
- **Instagram:** 25 Reels/day per account
- **Strategy:** Multi-account pools (10-20 accounts per platform) for scale

### Security
- Tokens encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`)
- OAuth state validation (CSRF protection)
- Auto-disable accounts after persistent failures
- Separate refresh tokens stored encrypted

### Dashboard
- `/dashboard/social-accounts` — Connect/disconnect accounts, view quota usage
- OAuth flows: TikTok → `/api/social/connect/tiktok`, YouTube → `/api/social/connect/youtube`, Instagram → `/api/social/connect/instagram`

### Usage
```typescript
// Trigger posting after video generation
await inngest.send({
  name: "video/ready",
  data: {
    videoId: "video_123",
    tenantId: "tenant_456",
    conceptId: "concept_789",
    category: "finance",
    platforms: ["tiktok", "youtube", "instagram"],
    caption: "This is my viral video caption",
    hashtags: ["#finance", "#viral", "#fyp"]
  }
});
```

### Environment Variables
```
# TikTok
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...

# YouTube (Google OAuth)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/social/connect/youtube

# Instagram (Facebook Business)
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Token encryption (32-byte key)
TOKEN_ENCRYPTION_KEY=change-this-to-random-32-byte-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Global Rules
@~/.claude/rules/my-coding-standards.md
@~/.claude/rules/my-security-rules.md
@~/.claude/rules/my-workflows.md
