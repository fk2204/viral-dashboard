# Repository Map

## Root
- `src/` — all application code
- `public/` — static assets (empty after cleanup)
- `.claude/` — project config (CLAUDE.md, REPO-MAP.md, STRUCTURE.md, DECISIONS.md)
- `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- `.env.local` — API keys (YouTube, Reddit, GNews)
- `.gitignore`

## src/app/ — Pages + API Routes
- `page.tsx`, `layout.tsx`, `globals.css`, `favicon.ico` — home, layout, styles, icon
- `history/page.tsx` — saved generations history
- `analytics/page.tsx` — performance analytics
- `api/generate/route.ts` — POST: generate concepts from trends
- `api/trends/route.ts` — GET/POST: fetch + score trends
- `api/history/route.ts` — GET/DELETE: saved generations
- `api/feedback/route.ts` — GET/POST: performance metrics
- `api/cron/daily-generate/route.ts` — scheduled daily generation
- `api/cron/learn/route.ts` — scheduled learning cycle

## src/components/ — React UI
- `Dashboard.tsx` (orchestrator), `ConceptCard.tsx`, `TrendScanner.tsx`, `PromptViewer.tsx`
- `AnalyticsChart.tsx`, `ExportButton.tsx`, `Header.tsx`

## src/lib/ — Business Logic
- `generator.ts` (concept engine), `trends.ts` (aggregation + scoring), `prompts.ts` (Sora/Veo)
- `virality.ts`, `monetization.ts`, `knowledge.ts` + `knowledge-base.json`
- `learner.ts`, `cache.ts`, `storage.ts` (Dexie), `daily-store.ts`, `export.ts`

## src/lib/sources/ — Trend Data (5 APIs)
- `youtube.ts`, `reddit.ts`, `gnews.ts`, `google-trends.ts`, `tiktok-creative.ts`

## src/lib/learning/ — AI Learning System
- `ab-variants.ts`, `effectiveness-scorer.ts`, `pattern-extractor.ts`
- `template-evolver.ts`, `performance-tracker.ts`, `performance-history.json`

## src/types/
- `index.ts` — all interfaces (ViralConcept, TrendData, Generation, PerformanceFeedback, etc.)
