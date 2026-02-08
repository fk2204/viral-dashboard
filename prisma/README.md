# Prisma Database Schema

## Overview

This directory contains the Prisma ORM configuration for the Viral Dashboard's PostgreSQL database (Neon serverless).

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/viral_dashboard?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/viral_dashboard"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Migrations

```bash
# Development (creates migration files)
npx prisma migrate dev --name init

# Production (applies migrations)
npx prisma migrate deploy
```

### 5. Open Prisma Studio (Optional)

```bash
npx prisma studio
```

Opens visual database editor at http://localhost:5555

## Schema Structure

### Core Tables

- **users** - User accounts (Clerk integration)
- **tenants** - Multi-tenant organizations
- **generations** - Generated viral content batches
- **videos** - Generated video files (Phase 2)

### Social Media (Phase 3)

- **social_accounts** - Connected social media accounts
- **social_posts** - Posted content tracking

### Performance Tracking

- **performance_feedback** - Manual/scraped performance data
- **analytics_snapshots** - Time-series analytics

### Reflexion System (Self-Learning AI)

- **self_critiques** - Claude API self-critiques
- **reflexion_insights** - Discovered patterns
- **scoring_adjustments** - Auto-applied weight adjustments

### Infrastructure

- **job_queue** - Background job queue (Inngest integration)
- **system_metrics** - System health metrics
- **api_usage** - API request tracking

## Common Commands

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name <name>

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

### Client Generation

```bash
# Generate Prisma Client
npx prisma generate

# Generate and watch for schema changes
npx prisma generate --watch
```

### Database Utilities

```bash
# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from existing database
npx prisma db pull

# Push schema to database (no migrations)
npx prisma db push
```

## Neon-Specific Configuration

### Connection Pooling

Neon provides connection pooling automatically. Use `DATABASE_URL` for pooled connections (API routes) and `DIRECT_URL` for migrations:

```env
# Pooled connection (for app)
DATABASE_URL="postgresql://...?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://..."
```

### Branching

Neon supports database branches (like Git):

```bash
# Create feature branch
neon branches create feature/video-generation

# Get branch connection string
neon connection-string feature/video-generation
```

## Multi-Tenancy

All tenant-specific tables have a `tenantId` foreign key with cascading deletes:

```prisma
model Generation {
  id       String @id @default(uuid())
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ...
}
```

### Row-Level Security

Use `setTenantContext()` in API routes:

```typescript
import { setTenantContext } from '@/lib/storage-prisma';

// In API route
const user = await db.user.findUnique({ where: { clerkId: userId } });
setTenantContext(user.tenantId);

// All queries now automatically filtered by tenant
const generations = await getGenerations(); // only this tenant's data
```

## Indexes

Optimized indexes for common queries:

- `users.clerkId` - Fast auth lookups
- `generations.tenantId, generations.date` - Sorted history
- `videos.conceptId` - Link videos to concepts
- `social_posts.platform, social_posts.postedAt` - Platform analytics
- `self_critiques.confidenceLevel` - Filter high-confidence critiques

## Performance Tips

### Connection Pooling

Use Prisma's connection pooling for serverless:

```typescript
// lib/db.ts
export const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

### Query Optimization

```typescript
// Bad: N+1 queries
for (const gen of generations) {
  const tenant = await db.tenant.findUnique({ where: { id: gen.tenantId } });
}

// Good: Include relation
const generations = await db.generation.findMany({
  include: { tenant: true },
});
```

### Batch Operations

```typescript
// Bad: Multiple queries
for (const insight of insights) {
  await db.reflexionInsight.create({ data: insight });
}

// Good: Single transaction
await db.$transaction(
  insights.map(insight =>
    db.reflexionInsight.create({ data: insight })
  )
);
```

## Backup & Restore

### Automated Backups

Neon provides point-in-time recovery (PITR) automatically:

- Retention: 7 days (free tier), 30 days (paid)
- Granularity: 1 second
- Restore via Neon dashboard or CLI

### Manual Backup

```bash
# Export to SQL
pg_dump $DATABASE_URL > backup.sql

# Restore from SQL
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Error: "Can't reach database server"

- Check `DATABASE_URL` is correct
- Verify IP allowlist (if configured)
- Test with `npx prisma db execute --stdin <<< "SELECT 1;"`

### Error: "Unique constraint violation (P2002)"

- Use `upsert` instead of `create`
- Check for existing records before creating

### Error: "Connection pool timeout"

- Increase pool size: `DATABASE_URL="...?connection_limit=10"`
- Use connection pooling (Neon built-in)

## Security

### Encryption

- **In transit:** TLS 1.3 (enforced by `sslmode=require`)
- **At rest:** AES-256 (Neon default)
- **Backups:** Encrypted with AES-256

### Access Control

- Use environment variables for credentials (never hardcode)
- Rotate credentials quarterly
- Use read-only replicas for analytics queries

### Sensitive Data

Encrypted fields (use Prisma middleware):

```typescript
// Encrypt before save
prisma.$use(async (params, next) => {
  if (params.model === 'SocialAccount' && params.action === 'create') {
    params.args.data.accessToken = encrypt(params.args.data.accessToken);
  }
  return next(params);
});
```

## Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **Neon Docs:** https://neon.tech/docs
- **Schema Reference:** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- **Prisma Studio:** https://www.prisma.io/studio

---

**Current Version:** 1.0.0
**Last Updated:** 2026-02-07
**Schema Status:** ✅ Ready for Phase 1 deployment
