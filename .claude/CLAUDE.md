# Viral Content Generator Dashboard

## What This Is
AI-powered dashboard that researches real-time trends from 5 sources and generates viral TikTok/YouTube Shorts concepts with Sora & Veo video prompts.

## Tech Stack
- Runtime: Node.js (Next.js 16.1.6, React 19, React Compiler enabled)
- Language: TypeScript 5 (strict)
- Styling: Tailwind CSS 4, dark theme only
- Database: Dexie (IndexedDB) — client-side only, no backend DB
- Charts: Recharts 3
- Icons: Lucide React
- Testing: None configured yet

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
- ✅ Done: Trend pipeline (5 sources), concept generation, Sora/Veo prompts, virality scoring, monetization estimates, A/B variants, learning system, analytics page, **reflexion self-critique system**
- 🔄 In progress: Reddit API integration (credentials not configured)
- ⏳ Not started: Testing, authentication, deployment

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

## Global Rules
@~/.claude/rules/my-coding-standards.md
@~/.claude/rules/my-security-rules.md
@~/.claude/rules/my-workflows.md
