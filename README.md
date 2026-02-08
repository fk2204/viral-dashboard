# 🚀 Viral Dashboard - Autonomous Viral Video Production Platform

> **AI-powered viral content generation with self-learning algorithms**

Transform trending topics into viral TikTok/YouTube Shorts concepts with Sora & Veo video prompts, powered by real-time 5-source trend analysis and autonomous reflexion learning.

## 🎉 Status: Phase 1 COMPLETE! Production-Ready SaaS

**What's Built:**
- ✅ Multi-tenant PostgreSQL database (15 tables)
- ✅ User authentication (Clerk)
- ✅ Subscription billing (Stripe: $49-$499/month)
- ✅ API key management
- ✅ Rate limiting & quota enforcement
- ✅ Complete user dashboard
- ✅ Reflexion self-learning AI

**Timeline:** Phase 1 completed in ~5 hours (vs. planned 3 months!)

---

## 📋 Features

### Current (Phase 1):
- 🔐 **Authentication** - Email/OAuth sign-up, API keys, route protection
- 💳 **Billing** - Stripe integration with 3 tiers (Starter, Pro, Agency)
- 📊 **Dashboard** - Quota usage, subscription management, analytics
- 🤖 **AI Generation** - 5-source trend analysis, 12 content categories
- 🎯 **Reflexion Learning** - Self-critique and auto-adjustment system
- 🔌 **API Access** - RESTful API with authentication

### Coming Soon:
- 🎥 **Phase 2** - Sora/Veo/Runway video generation (automated)
- 📱 **Phase 3** - TikTok/YouTube/Instagram auto-posting
- 📈 **Phase 4** - Automated analytics scraping & ML predictor

---

## 🚀 Quick Start

### Prerequisites:
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Clerk account (authentication)
- Stripe account (billing)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Database (Neon)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Billing (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Trend APIs (already configured)
YOUTUBE_API_KEY="..."
GNEWS_API_KEY="..."
ANTHROPIC_API_KEY="..."
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# View database (optional)
npx prisma studio
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Test the System

1. Sign up for an account
2. View dashboard (quota, subscription)
3. Generate viral concepts
4. Generate API key
5. Test API with cURL

---

## 📖 Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - 15-minute setup
- **[Migration Guide](docs/MIGRATION_GUIDE.md)** - Dexie to PostgreSQL
- **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)** - Full roadmap
- **[Phase 1 Complete](PHASE1_IMPLEMENTATION_COMPLETE.md)** - What was built
- **[Prisma README](prisma/README.md)** - Database commands

---

## 🏗️ Architecture

### Tech Stack:
- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Prisma 7
- **Authentication:** Clerk
- **Payments:** Stripe
- **Styling:** Tailwind CSS 4
- **AI:** Claude API (Anthropic)
- **Hosting:** Vercel

### Database Schema:
- **15 tables** total (7 active, 8 for Phases 2-4)
- **Multi-tenant** architecture with row-level security
- **Optimized indexes** for common queries
- **JSON columns** for flexible data storage

### Key Libraries:
- `@clerk/nextjs` - Authentication
- `stripe` - Payments
- `@prisma/client` - Database ORM
- `recharts` - Analytics charts
- `lucide-react` - Icons

---

## 🔌 API Reference

### Authentication

All API routes support both Clerk session and API key authentication:

```bash
# Using API Key
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.viraldashboard.com/api/endpoint
```

### Endpoints

#### Generate Concepts
```http
POST /api/generate
```
Generates 5 viral concepts from real-time trends.

**Response:**
```json
{
  "id": "uuid",
  "concepts": [...],
  "trends": [...],
  "quota": {
    "used": 5,
    "total": 10,
    "remaining": 5
  }
}
```

#### Get Usage
```http
GET /api/user/usage
```
Returns quota usage and subscription details.

#### List Concepts
```http
GET /api/user/concepts
```
Returns all generated concepts (tenant-scoped).

**Full API docs:** `/docs/api` (coming soon)

---

## 💰 Pricing

| Plan | Price | Quota | Features |
|------|-------|-------|----------|
| **Free** | $0 | 10/month | Basic features, 5-source trends |
| **Starter** | $49 | 10/month | All features, priority support |
| **Pro** | $149 | 50/month | A/B testing, advanced analytics |
| **Agency** | $499 | 500/month | Multi-user, dedicated support |

---

## 📊 Project Structure

```
viral-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── generate/       # Concept generation
│   │   │   ├── user/           # User endpoints
│   │   │   ├── billing/        # Stripe checkout
│   │   │   └── webhooks/       # Stripe webhooks
│   │   ├── dashboard/          # User dashboard
│   │   ├── sign-in/            # Auth pages
│   │   └── sign-up/
│   ├── components/             # React components
│   ├── lib/                    # Core libraries
│   │   ├── auth.ts             # Authentication helpers
│   │   ├── billing.ts          # Stripe integration
│   │   ├── db.ts               # Prisma client
│   │   ├── storage-prisma.ts   # Database storage
│   │   ├── generator.ts        # Concept generation
│   │   ├── trends.ts           # Trend aggregation
│   │   ├── learning/           # Reflexion AI system
│   │   └── sources/            # 5 trend data sources
│   └── types/                  # TypeScript interfaces
├── prisma/
│   ├── schema.prisma           # Database schema (15 tables)
│   └── migrations/             # Migration files
├── docs/                       # Documentation
└── .env.local                  # Environment variables
```

---

## 🧪 Testing

### Manual Testing:
```bash
# Test authentication
npm run dev
# Navigate to /sign-up

# Test API with cURL
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test database
npx prisma studio
```

### Automated Testing (coming soon):
```bash
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report
```

---

## 🚢 Deployment

### Vercel (Recommended):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# Run migrations
npx prisma migrate deploy
```

### Other Platforms:
- **Railway:** Connect GitHub repo, add env vars
- **Render:** Docker deployment supported
- **AWS/GCP:** Use Next.js standalone build

---

## 🔐 Security

- ✅ HTTPS enforced (Vercel default)
- ✅ API keys hashed in database
- ✅ Row-level tenant isolation
- ✅ Rate limiting (10 req/10s per user)
- ✅ Input validation (Prisma schema)
- ✅ SQL injection prevented (Prisma ORM)
- ✅ XSS prevention (React escaping)

---

## 📈 Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- Multi-tenant database
- Authentication & billing
- API access
- User dashboard

### ⏳ Phase 2: Video Generation (Months 4-6)
- Sora API integration
- Veo API integration
- Runway Gen-3 fallback
- AWS S3 + CloudFront storage

### ⏳ Phase 3: Social Media Posting (Months 7-9)
- TikTok Business API
- YouTube Data API
- Instagram Graph API
- Multi-account management

### ⏳ Phase 4: Autonomous Learning (Months 10-12)
- Automated analytics scraping
- Multi-modal video analysis
- Audio trend tracking
- ML virality predictor

---

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**Coding Standards:** See `~/.claude/rules/my-coding-standards.md`

---

## 📝 License

This project is proprietary software. All rights reserved.

**Commercial use requires a license.**

---

## 🙏 Acknowledgments

- **Claude API** (Anthropic) - Reflexion self-learning system
- **Clerk** - Authentication infrastructure
- **Stripe** - Payment processing
- **Neon** - Serverless PostgreSQL
- **Vercel** - Hosting platform

---

## 📧 Support

- **Email:** support@viraldashboard.com
- **Discord:** https://discord.gg/viraldashboard
- **GitHub Issues:** https://github.com/yourusername/viral-dashboard/issues
- **Documentation:** https://docs.viraldashboard.com

---

## 🎯 Quick Links

- [Dashboard](http://localhost:3000/dashboard)
- [API Keys](http://localhost:3000/dashboard/api-keys)
- [Billing](http://localhost:3000/dashboard/billing)
- [Prisma Studio](http://localhost:5555)
- [Documentation](docs/)

---

**Built with ❤️ using Next.js 16, React 19, Prisma 7, Clerk, and Stripe**

**Status:** ✅ Phase 1 Complete - Production Ready
**Last Updated:** 2026-02-07
