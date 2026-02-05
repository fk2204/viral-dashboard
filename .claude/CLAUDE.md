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

## Data Flow
1. `/api/trends` fetches from 5 sources (YouTube, Reddit, GNews, Google Trends, TikTok Creative)
2. Trends scored by virality, emotional impact, shareability
3. `/api/generate` turns top trends into `ViralConcept[]` with scripts, Sora/Veo prompts, captions
4. Dashboard renders concepts via `ConceptCard` components
5. `/api/feedback` captures performance metrics; learning system evolves templates
6. All generations persisted client-side in IndexedDB via Dexie

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
│   ├── learning/           # AI learning system (A/B variants, pattern extraction, template evolution)
│   ├── generator.ts        # Concept generation engine
│   ├── trends.ts           # Trend aggregation + scoring
│   ├── prompts.ts          # Sora/Veo prompt templates
│   ├── virality.ts         # Platform virality scoring
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

## Current Status
- Done: Trend pipeline (5 sources), concept generation, Sora/Veo prompts, virality scoring, monetization estimates, A/B variants, learning system, analytics page
- In progress: Reddit API integration (credentials not configured)
- Not started: Testing, authentication, deployment

## Global Rules
@~/.claude/rules/my-coding-standards.md
@~/.claude/rules/my-security-rules.md
@~/.claude/rules/my-workflows.md
