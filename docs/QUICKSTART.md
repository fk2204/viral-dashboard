# Quick Start Guide - Phase 1 Database Setup

## ✅ What's Already Done

Phase 1.1 (Database Migration) is complete:
- ✅ Prisma and @prisma/client installed (7.3.0)
- ✅ Database schema created (`prisma/schema.prisma`)
- ✅ Storage API created (`src/lib/storage-prisma.ts`)
- ✅ Environment template updated (`.env.example`)
- ✅ Documentation written

## 🚀 Next Steps (15 minutes)

### Step 1: Set Up Neon Database (5 min)

1. Go to https://neon.tech and sign up (free tier)
2. Click "Create Project"
   - Name: `viral-dashboard-prod`
   - Region: `US East (Ohio)` (recommended)
3. Copy the connection string
4. Create `.env.local` file:

```bash
# Copy the template
cp .env.example .env.local
```

5. Edit `.env.local` and replace:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://YOUR_USER:YOUR_PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb"
```

**Pro Tip:** Neon provides both URLs in the connection details. Copy both!

### Step 2: Generate Prisma Client (2 min)

```bash
npx prisma generate
```

Expected output:
```
✔ Generated Prisma Client (v7.3.0)
```

### Step 3: Run Database Migrations (3 min)

```bash
npx prisma migrate dev --name init
```

This creates all 15 tables:
- users, tenants
- generations, videos
- social_accounts, social_posts
- performance_feedback, analytics_snapshots
- self_critiques, reflexion_insights, scoring_adjustments
- audio_trends, competitor_videos
- job_queue, system_metrics, api_usage

Expected output:
```
✔ Your database is now in sync with your schema.
```

### Step 4: Verify Setup (5 min)

```bash
# Open Prisma Studio (visual database editor)
npx prisma studio
```

Opens at http://localhost:5555

**Check:**
- ✅ All 15 tables visible in left sidebar
- ✅ Each table has correct columns
- ✅ No errors in console

### Step 5: Test Connection

Run this test script:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
  console.log('✅ Database connected!');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

Expected: `✅ Database connected!`

## 🔧 Troubleshooting

### Error: "Can't reach database server"

**Solution:** Check `DATABASE_URL` in `.env.local`
- Ensure `sslmode=require` is at the end
- Verify password has no special characters (or URL-encode them)

### Error: "Unique constraint violation"

**Solution:** Database already has data
```bash
npx prisma migrate reset  # WARNING: Deletes all data
```

### Error: "Module not found: @prisma/client"

**Solution:** Regenerate Prisma Client
```bash
npx prisma generate
```

## 📊 Database Schema Overview

### Core Tables (Phase 1)

```
users (Clerk authentication)
├── id (UUID)
├── clerkId (unique)
├── email (unique)
├── tenantId (foreign key)
└── apiKey (optional)

tenants (Multi-tenancy)
├── id (UUID)
├── name
├── subscriptionTier (FREE, STARTER, PRO, AGENCY)
├── monthlyQuota (10-500 concepts)
├── usedQuota
└── stripeCustomerId

generations (Viral concepts)
├── id (UUID)
├── tenantId (foreign key)
├── date
├── concepts (JSON)
├── trends (JSON)
└── isFavorite

self_critiques (Reflexion system)
├── id (UUID)
├── tenantId (foreign key)
├── conceptId
├── performanceGap (JSON)
├── critique (text)
└── confidenceLevel
```

### Future Tables (Phase 2-4)

- `videos` - Generated video files
- `social_accounts` - Connected TikTok/YouTube/Instagram
- `social_posts` - Posted content tracking
- `analytics_snapshots` - Performance over time
- `audio_trends` - TikTok trending sounds
- `competitor_videos` - Competitor analysis
- `job_queue` - Background jobs

## 🎯 What's Next?

After completing these steps:

### Option A: Continue with Phase 1 (Recommended)

**Phase 1.2: User Authentication**
- Install Clerk
- Add login/signup pages
- Protect API routes

**Timeline:** 1-2 weeks
**Command:** Tell me "Continue with Phase 1.2"

### Option B: Test Current System

Test the migration with existing Dexie data:
1. Export current Dexie data (IndexedDB)
2. Import to PostgreSQL
3. Verify reflexion system works

**Timeline:** 1 day
**Command:** Tell me "Test the migration"

### Option C: Skip to Phase 2 (Advanced)

Start building video generation:
- Sora/Veo API integration
- Inngest job queue
- AWS S3 storage

**Timeline:** 3-4 weeks
**Command:** Tell me "Start Phase 2"

## 📚 Resources

- **Migration Guide:** `docs/MIGRATION_GUIDE.md` (detailed instructions)
- **Implementation Status:** `docs/IMPLEMENTATION_STATUS.md` (full roadmap)
- **Prisma README:** `prisma/README.md` (database commands)

## 🆘 Need Help?

**Common Issues:**
1. "Can't reach database" → Check `.env.local` connection string
2. "Prisma Client not found" → Run `npx prisma generate`
3. "Migration failed" → Run `npx prisma migrate reset` (WARNING: deletes data)

**Get Support:**
- Neon Discord: https://discord.gg/neon
- Prisma Discord: https://discord.gg/prisma
- Check `docs/MIGRATION_GUIDE.md` for detailed troubleshooting

---

**Ready?** Let's get your database set up in 15 minutes! 🚀

**After setup, tell me:** "Database is ready" and I'll help you with Phase 1.2 (Authentication).
