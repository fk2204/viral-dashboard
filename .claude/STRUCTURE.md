# Code Structure

## Data Flow
```
Dashboard → fetch("/api/generate") → trends.ts (5 sources + cache) → generator.ts → Response
                                        ↓ uses: prompts, knowledge, virality, monetization, learning/*
Dashboard → saveGeneration() → storage.ts (Dexie/IndexedDB)
Dashboard → fetch("/api/feedback") → performance-tracker.ts → performance-history.json
```

## Module Dependencies
```
api/generate  → trends.ts → sources/{youtube,reddit,gnews,google-trends,tiktok-creative}.ts + cache.ts
              → generator.ts → prompts.ts, knowledge.ts, virality.ts, monetization.ts
                             → learning/{template-evolver,effectiveness-scorer,ab-variants}.ts
api/feedback  → learning/performance-tracker.ts → performance-history.json
api/cron/learn → learner.ts → learning/pattern-extractor.ts
api/cron/daily-generate → daily-store.ts + generator.ts
```

## Entry Points
- **App shell**: `layout.tsx` → Header + page
- **Home**: `page.tsx` → `Dashboard.tsx` (client component, orchestrates UI)
- **API**: `api/*/route.ts` (Route Handlers, validation inline — no middleware)
- **Storage**: `storage.ts` (Dexie IndexedDB, called from components)
