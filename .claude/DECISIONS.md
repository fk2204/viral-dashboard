# Technical Decisions

## Next.js App Router (not Pages Router)
Why: Colocated API routes with `route.ts`, React Server Components, simpler layouts. React Compiler enabled for auto-memoization.

## No Backend Database — Dexie/IndexedDB Only
Why: Single-user dashboard, no auth needed. All generations persist client-side. Eliminates hosting costs, DB setup, and migration complexity. Trade-off: data is per-browser, not portable.

## 5 Trend Sources with Fallback Array
Why: No single API is reliable enough. If all APIs fail, hardcoded fallback topics keep generation working. Sources scored and merged in `trends.ts` with in-memory TTL cache (not Redis — no infra needed for a client-side app).

## Inline Validation in Route Handlers (No Middleware)
Why: Next.js Route Handlers don't chain middleware like Express. Validation lives directly in each `route.ts`. Keeps it simple for a small API surface.

## JSON File Persistence for Learning System
Why: `performance-history.json` stores feedback data on disk. Avoids a database dependency for the learning loop. Trade-off: doesn't scale past single-server, but suits this use case.

## Business Logic in `lib/`, Not `services/`
Why: Follows Next.js convention. Generator, trends, virality, monetization are pure functions called by route handlers. No class-based service layer — just exported functions.

## Known Limitations
- No auth — anyone with the URL can generate (fine for personal use)
- No tests yet — needs Jest or Vitest setup
- Reddit API credentials not configured — source returns empty
- Learning data resets on redeploy (JSON file, not persisted DB)
