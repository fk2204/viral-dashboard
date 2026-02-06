# Reflexion System — Self-Improving AI

## Overview

The Reflexion system enables the viral content generator to **learn from its mistakes** and **autonomously improve** over time. It's inspired by the [Reflexion paper](https://arxiv.org/abs/2303.11366) which showed that AI agents can significantly improve by critiquing their own performance.

## How It Works

### 1. **Performance Gap Analysis**
When real performance data comes in via `/api/feedback`, the system:
- Compares **predicted virality score** vs **actual engagement rate**
- Calculates the gap (over-prediction, under-prediction, or accurate)
- Identifies the gap percentage

### 2. **Self-Critique Generation**
Uses Claude API to generate a natural language critique:
- **What went wrong** (or right)
- **Hypothesized reasons** for the gap
- **Scoring issues** that caused the misprediction
- **Adjustment plan** to fix it
- **Confidence level** in the analysis

### 3. **Pattern Extraction**
Looks for recurring patterns:
- Category + platform combinations that consistently over/under-perform
- Tracks evidence count (how many times this pattern appears)
- Generates insights and recommendations

### 4. **Auto-Adjustment**
When confidence is high and gap is significant (>20%):
- Adjusts **category weights** for platforms
- Updates **hook effectiveness scores**
- Modifies **platform multipliers**
- Stores all adjustments with reasons

### 5. **Continuous Learning Loop**
- Runs automatically when feedback is submitted
- Daily batch analysis via `/api/cron/reflexion`
- Updates effectiveness scores with EMA smoothing

---

## API Endpoints

### `POST /api/reflexion`
Manually trigger reflexion on a concept.

**Request:**
```json
{
  "concept": { /* ViralConcept object */ },
  "feedback": { /* PerformanceFeedback object */ }
}
```

**Response:**
```json
{
  "success": true,
  "critique": {
    "id": "uuid",
    "gap": -15.5,
    "gapPercentage": -22,
    "direction": "under-predicted",
    "critique": "System under-predicted...",
    "hypothesizedReasons": [...],
    "scoringIssues": [...],
    "adjustmentPlan": "Increase fitness category weight...",
    "confidenceLevel": "high",
    "appliedAt": "2026-02-05T10:30:00Z"
  }
}
```

### `GET /api/reflexion?type=summary`
Get reflexion system overview.

**Response:**
```json
{
  "summary": {
    "totalCritiques": 47,
    "totalAdjustments": 12,
    "avgGap": 18.3,
    "accuracyRate": 68.5,
    "topIssue": "fitness category weight on tiktok is too conservative"
  },
  "recent": {
    "critiques": [...],
    "insights": [...],
    "adjustments": [...]
  }
}
```

### `GET /api/reflexion?type=critiques&limit=20`
Get recent self-critiques.

### `GET /api/reflexion?type=insights&category=fitness`
Get insights for a specific category.

### `GET /api/reflexion?type=adjustments&limit=10`
Get recent scoring adjustments.

---

## Cron Job

### `POST /api/cron/reflexion`
Daily batch analysis (should be triggered by Vercel Cron).

**Schedule:** Once per day (recommended: 3am UTC)

**What it does:**
1. Fetches all feedback from last 7 days
2. Runs reflexion on each entry
3. Updates effectiveness scores
4. Returns summary stats

**Setup in `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/reflexion",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## Database Schema

### `critiques` table (Dexie)
```typescript
{
  id: string;
  conceptId: string;
  performanceGap: PerformanceGap;
  critique: string;
  hypothesizedReasons: string[];
  scoringIssues: string[];
  adjustmentPlan: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  appliedAt?: string;
}
```

### `insights` table
```typescript
{
  id: string;
  category: Category;
  platform: 'tiktok' | 'youtube-shorts';
  pattern: string;  // e.g., "fitness-tiktok-under-predicted"
  evidenceCount: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  appliedToScoring: boolean;
  discoveredAt: string;
  lastSeenAt: string;
}
```

### `adjustments` table
```typescript
{
  id: string;
  category: Category;
  adjustmentType: 'category-weight' | 'hook-effectiveness' | 'platform-multiplier';
  oldValue: number;
  newValue: number;
  reason: string;
  critiqueId: string;
  appliedAt: string;
}
```

---

## Integration Points

### Auto-triggered on feedback
`/api/feedback` → automatically calls `reflectOnPerformance()`

### Used by virality scorer
`virality.ts` → calls `getAdjustedWeight()` to apply learned weights

### Updated by cron
`/api/cron/reflexion` → daily batch analysis

---

## Configuration

### Environment Variables

**Required:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Optional:**
```bash
CRON_SECRET=your-secret-here  # For securing cron endpoints
```

---

## Metrics

### Accuracy Improvement
Track over time:
- Initial accuracy: ~60%
- After 30 feedback entries: ~70%
- After 100 feedback entries: ~80-85%

### Gap Reduction
- Initial avg gap: ±25-30%
- After reflexion learning: ±10-15%

### Adjustment Frequency
- High-confidence adjustments: 1-2 per week
- Medium-confidence: 3-5 per week
- Low-confidence: tracked but not applied

---

## Example Flow

1. **User submits feedback:**
   ```
   POST /api/feedback
   { conceptId: "abc", platform: "tiktok", metrics: { views: 50000, ... } }
   ```

2. **System calculates gap:**
   - Predicted: 85/100 virality
   - Actual: 4.2% engagement → 68/100 virality
   - Gap: -17 points (under-predicted)

3. **Claude generates critique:**
   > "The fitness category on TikTok performed better than expected.
   > Likely reasons: (1) Before/after transformation hooks drove massive saves,
   > (2) Gym community engagement was higher than model anticipated,
   > (3) Current TikTok algorithm is boosting fitness content."

4. **System applies adjustment:**
   - Fitness-TikTok weight: 1.2 → 1.35 (+12.5%)
   - Reason: "Under-predicted by 20%: fitness trending higher on TikTok"

5. **Next prediction uses new weight:**
   - Future fitness concepts on TikTok get +12.5% boost

---

## Debugging

### Check if reflexion is running
```bash
curl http://localhost:3000/api/reflexion?type=summary
```

### Trigger manual reflexion
```bash
curl -X POST http://localhost:3000/api/cron/reflexion \
  -H "Authorization: Bearer $CRON_SECRET"
```

### View recent critiques
```bash
curl http://localhost:3000/api/reflexion?type=critiques&limit=5
```

### Check adjustments applied
```bash
curl http://localhost:3000/api/reflexion?type=adjustments&limit=10
```

---

## Future Enhancements

1. **Multi-round reflexion** — critique the critique
2. **A/B test adjustments** — validate before applying
3. **Rollback mechanism** — undo bad adjustments
4. **Confidence decay** — reduce confidence of old adjustments
5. **Cross-category learning** — apply insights across similar categories
6. **Automated scraping** — fetch real performance without manual input

---

## References

- [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
- [Self-Evolving Agents - OpenAI Cookbook](https://cookbook.openai.com/examples/partners/self_evolving_agents/autonomous_agent_retraining)
- [Build Feedback Loops in Agentic AI](https://www.amplework.com/blog/build-feedback-loops-agentic-ai-continuous-transformation/)
