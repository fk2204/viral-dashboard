# Migration Guide: Dexie to PostgreSQL

## Overview

This guide explains how to migrate the Viral Dashboard from client-side Dexie (IndexedDB) storage to server-side PostgreSQL with Prisma ORM for the multi-tenant SaaS architecture.

## Why Migrate?

**Current (Dexie/IndexedDB):**
- ✅ Simple, no backend needed
- ❌ Data only on user's browser
- ❌ No multi-user support
- ❌ No server-side processing
- ❌ Limited to 50-100MB storage

**Target (PostgreSQL/Prisma):**
- ✅ Multi-tenant SaaS architecture
- ✅ Unlimited storage
- ✅ Server-side processing (cron jobs, automation)
- ✅ User authentication & billing
- ✅ API access for mobile apps
- ✅ Data analytics and reporting

## Phase 1: Database Setup

### Step 1: Create Neon PostgreSQL Database

1. Sign up at https://neon.tech (free tier available)
2. Create a new project: "viral-dashboard-prod"
3. Copy the connection string
4. Add to `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/viral_dashboard?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/viral_dashboard"
```

### Step 2: Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# View database in Prisma Studio (optional)
npx prisma studio
```

This creates all tables defined in `prisma/schema.prisma`:
- `users`, `tenants` (multi-tenancy)
- `generations`, `videos` (content)
- `social_accounts`, `social_posts` (Phase 3)
- `performance_feedback`, `analytics_snapshots` (tracking)
- `self_critiques`, `reflexion_insights`, `scoring_adjustments` (reflexion)
- `job_queue`, `system_metrics`, `api_usage` (infrastructure)

### Step 3: Verify Connection

```bash
# Test database health
npx prisma db execute --stdin <<SQL
SELECT 1;
SQL
```

## Phase 2: Code Migration

### Current File Structure

```
src/lib/storage.ts          # Dexie storage (client-side)
src/app/api/*/route.ts      # API routes (no auth, no tenant isolation)
```

### New File Structure

```
src/lib/db.ts               # Prisma client (server-side)
src/lib/storage-prisma.ts   # Backward-compatible storage API
src/lib/auth.ts             # Clerk authentication (new)
src/lib/billing.ts          # Stripe integration (new)
src/middleware.ts           # Auth + tenant context (new)
```

### Backward Compatibility

The new `storage-prisma.ts` provides the **same API** as `storage.ts`:

```typescript
// Before (Dexie)
import { saveGeneration, getGenerations } from '@/lib/storage';

// After (Prisma) - SAME API
import { saveGeneration, getGenerations } from '@/lib/storage-prisma';
```

**Migration Strategy:**
1. Keep `storage.ts` (Dexie) for local development fallback
2. Use `storage-prisma.ts` in production (server-side only)
3. Add `setTenantContext()` in API routes (new requirement)

### Example: Migrate API Route

**Before (Dexie - client-side):**

```typescript
// src/app/api/generate/route.ts
import { saveGeneration } from '@/lib/storage';

export async function POST(req: Request) {
  const generation = await generateConcepts();
  await saveGeneration(generation); // saved to user's browser
  return Response.json(generation);
}
```

**After (Prisma - server-side):**

```typescript
// src/app/api/generate/route.ts
import { auth } from '@clerk/nextjs/server';
import { setTenantContext, saveGeneration } from '@/lib/storage-prisma';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Set tenant context (user's organization)
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  setTenantContext(user.tenantId);

  const generation = await generateConcepts();
  await saveGeneration(generation); // saved to PostgreSQL (tenant-scoped)
  return Response.json(generation);
}
```

## Phase 3: Data Migration Script

### Export Existing Dexie Data

```typescript
// scripts/export-dexie-data.ts
import { db } from '@/lib/storage';

async function exportData() {
  const generations = await db.generations.toArray();
  const critiques = await db.critiques.toArray();
  const insights = await db.insights.toArray();
  const adjustments = await db.adjustments.toArray();

  const exportData = {
    generations,
    critiques,
    insights,
    adjustments,
  };

  console.log(JSON.stringify(exportData, null, 2));
}

exportData();
```

### Import to PostgreSQL

```typescript
// scripts/import-to-postgres.ts
import { PrismaClient } from '@prisma/client';
import exportData from './dexie-export.json';

const prisma = new PrismaClient();

async function importData() {
  // Create default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Migrated User',
      subscriptionTier: 'FREE',
      monthlyQuota: 10,
      usedQuota: 0,
      quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Import generations
  for (const gen of exportData.generations) {
    await prisma.generation.create({
      data: {
        id: gen.id,
        tenantId: tenant.id,
        date: new Date(gen.date),
        concepts: gen.concepts,
        trends: gen.trends,
        isFavorite: gen.isFavorite,
      },
    });
  }

  // Import reflexion data
  for (const critique of exportData.critiques) {
    await prisma.selfCritique.create({
      data: {
        id: critique.id,
        tenantId: tenant.id,
        conceptId: critique.conceptId,
        performanceGap: critique.performanceGap,
        critique: critique.critique,
        hypothesizedReasons: critique.hypothesizedReasons,
        scoringIssues: critique.scoringIssues,
        adjustmentPlan: critique.adjustmentPlan,
        confidenceLevel: critique.confidenceLevel,
        createdAt: new Date(critique.createdAt),
        appliedAt: critique.appliedAt ? new Date(critique.appliedAt) : null,
      },
    });
  }

  console.log('Migration complete!');
}

importData();
```

## Phase 4: Authentication Setup

### Install Clerk

```bash
npm install @clerk/nextjs
```

### Configure Clerk

1. Sign up at https://clerk.com (free tier: 10,000 MAU)
2. Create application: "Viral Dashboard"
3. Add to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

### Add Middleware

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/generate(.*)',
  '/api/history(.*)',
  '/api/feedback(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### Protect API Routes

```typescript
// src/app/api/generate/route.ts
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of logic
}
```

## Phase 5: Billing Setup

### Install Stripe

```bash
npm install stripe
```

### Configure Stripe

1. Sign up at https://stripe.com
2. Create products:
   - Starter: $49/month (10 concepts)
   - Pro: $149/month (50 concepts)
   - Agency: $499/month (500 concepts)
3. Add to `.env.local`:

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    await db.tenant.update({
      where: { stripeCustomerId: subscription.customer as string },
      data: {
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscription.id,
      },
    });
  }

  return Response.json({ received: true });
}
```

## Phase 6: Testing Checklist

### Local Development

- [ ] Database connected (`npx prisma studio`)
- [ ] Clerk authentication working (sign up/in)
- [ ] API routes protected (401 without auth)
- [ ] Generations save to PostgreSQL
- [ ] Reflexion system working
- [ ] Quota tracking correct

### Production Deployment

- [ ] Neon database provisioned
- [ ] Clerk production keys configured
- [ ] Stripe production keys configured
- [ ] Environment variables set in Vercel
- [ ] Prisma migrations run (`npx prisma migrate deploy`)
- [ ] Webhook endpoints configured (Stripe, Clerk)

## Rollback Plan

If migration fails, revert to Dexie:

1. Comment out Prisma imports
2. Restore `import from '@/lib/storage'`
3. Remove auth checks temporarily
4. Deploy previous commit

## Cost Estimates (Phase 1)

- **Neon PostgreSQL:** $0-19/month (free tier → Scale plan)
- **Clerk Auth:** $0-25/month (free tier → Pro plan)
- **Stripe:** 2.9% + $0.30 per transaction
- **Vercel Hosting:** $20/month (Pro plan)

**Total:** ~$40-65/month for 100 users

## Next Steps

After successful migration:

1. **Phase 2:** Add video generation (Sora, Veo, Runway)
2. **Phase 3:** Social media posting automation
3. **Phase 4:** Performance tracking and full autonomous loop

## Troubleshooting

### Error: "Tenant context not set"

```typescript
// Always call setTenantContext() in API routes
const user = await db.user.findUnique({ where: { clerkId: userId } });
setTenantContext(user.tenantId);
```

### Error: "P2002: Unique constraint violation"

```typescript
// Use upsert instead of create
await db.generation.upsert({
  where: { id: generation.id },
  update: { ... },
  create: { ... },
});
```

### Error: "Connection pool timeout"

```env
# Increase connection pool size
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
```

## Support

- Neon docs: https://neon.tech/docs
- Prisma docs: https://www.prisma.io/docs
- Clerk docs: https://clerk.com/docs
- Stripe docs: https://stripe.com/docs

---

**Status:** Phase 1 complete ✅
**Next:** Phase 2 - Video Generation Integration
