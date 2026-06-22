# RedPulse — Technical Specification

**Version:** 1.1  
**Last updated:** June 2026  
**Status:** Draft

---

## 1. Executive Summary

RedPulse is a multi-tenant SaaS platform that automates Reddit marketing workflows: real-time post/comment discovery, AI-assisted reply generation, scheduled publishing, analytics, and team-based access control. The stack is Next.js (App Router), tRPC v10, Drizzle ORM on PostgreSQL (Railway), Auth.js, Upstash Redis, and Vercel deployment.

This document defines architecture, data model, API surface, auth flows, integrations, UI system, and deployment topology for engineering implementation.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Edge + Node)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Next.js App  │  │ tRPC Router  │  │ Auth.js (NextAuth v5)  │ │
│  │ (RSC + CSR)  │──│ Procedures   │──│ Sessions / OAuth       │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
    ┌────────▼────────┐            ┌───────▼────────┐
    │ Railway Postgres │            │ Upstash Redis  │
    │ (Drizzle ORM)    │            │ Rate limits,   │
    └──────────────────┘            │ job queues     │
                                    └───────┬────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────┐
              │                             │                     │
     ┌────────▼────────┐         ┌─────────▼────────┐  ┌────────▼────────┐
     │ Reddit Scraping │         │ Anthropic API    │  │ Background Jobs │
     │ (snoowrap/PRAW) │         │ (Claude)         │  │ (Bull / Agenda)  │
     └─────────────────┘         └──────────────────┘  └─────────────────┘
```

**Runtime split:**

| Layer | Responsibility |
|-------|----------------|
| **Next.js App Router** | Pages, layouts, RSC data fetching, landing/marketing site |
| **tRPC** | Type-safe API between client and server; shared Zod validators |
| **Drizzle + PostgreSQL** | Persistent storage, relational integrity |
| **Upstash Redis** | Rate limiting, session cache, scrape job deduplication |
| **Background workers** | Reddit scrape jobs (real-time + batch), scheduled posts, analytics aggregation |

---

## 3. Database Schema

All tables use UUID primary keys (`gen_random_uuid()`), `createdAt`/`updatedAt` timestamps, and soft-delete where noted. Drizzle schema lives in `src/server/db/schema/`.

### 3.1 Core Tables

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `email` | `varchar(255)` UNIQUE NOT NULL | |
| `passwordHash` | `text` NULL | NULL when OAuth-only |
| `name` | `varchar(255)` | Display name |
| `emailVerified` | `timestamptz` | |
| `image` | `text` | Avatar URL |
| `createdAt` | `timestamptz` | DEFAULT now() |
| `updatedAt` | `timestamptz` | |

#### `accounts` (Auth.js + Reddit OAuth)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `userId` | `uuid` FK → users | ON DELETE CASCADE |
| `provider` | `varchar(50)` | `credentials`, `google`, `reddit` |
| `providerAccountId` | `varchar(255)` | |
| `redditAccessToken` | `text` ENCRYPTED | AES-256-GCM at rest |
| `redditRefreshToken` | `text` ENCRYPTED | |
| `redditTokenExpiresAt` | `timestamptz` | |
| `redditUsername` | `varchar(100)` | |
| `scope` | `text` | OAuth scopes granted |

#### `teams`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `varchar(255)` NOT NULL | |
| `slug` | `varchar(100)` UNIQUE | URL-safe identifier |
| `ownerId` | `uuid` FK → users | |
| `plan` | `enum` | `free`, `pro`, `enterprise` |
| `createdAt` | `timestamptz` | |
| `updatedAt` | `timestamptz` | |

#### `teamMembers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK → teams | |
| `userId` | `uuid` FK → users | UNIQUE(teamId, userId) |
| `role` | `enum` | `owner`, `admin`, `editor`, `viewer` |
| `joinedAt` | `timestamptz` | |

**Role permissions matrix:**

| Permission | owner | admin | editor | viewer |
|------------|:-----:|:-----:|:------:|:------:|
| Manage billing | ✓ | ✓ | — | — |
| Invite/remove members | ✓ | ✓ | — | — |
| Connect Reddit accounts | ✓ | ✓ | ✓ | — |
| Create/edit campaigns | ✓ | ✓ | ✓ | — |
| Approve/send replies | ✓ | ✓ | ✓ | — |
| View analytics | ✓ | ✓ | ✓ | ✓ |

### 3.2 Reddit Content Tables

#### `keywordFilters`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `keywords` | `jsonb` | Array of strings + match mode |
| `subreddits` | `jsonb` | Allowlist; empty = all |
| `isActive` | `boolean` | DEFAULT true |

#### `discoveredPosts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `redditId` | `varchar(20)` UNIQUE | Reddit fullname |
| `subreddit` | `varchar(100)` | |
| `title` | `text` | |
| `body` | `text` | Self-text or empty |
| `author` | `varchar(100)` | |
| `score` | `integer` | |
| `numComments` | `integer` | |
| `url` | `text` | |
| `matchedKeywords` | `jsonb` | |
| `discoveredAt` | `timestamptz` | |

#### `posts` (scheduled / published)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `userId` | `uuid` FK | Author in RedPulse |
| `redditAccountId` | `uuid` FK → accounts | |
| `subreddit` | `varchar(100)` | |
| `title` | `text` | |
| `body` | `text` | |
| `status` | `enum` | `draft`, `scheduled`, `published`, `failed` |
| `scheduledAt` | `timestamptz` | Optimal-time slot |
| `publishedAt` | `timestamptz` | |
| `redditPostId` | `varchar(20)` | After publish |
| `banRiskScore` | `decimal(3,2)` | 0.00–1.00 |

#### `comments` (generated replies)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `userId` | `uuid` FK | Approver |
| `discoveredPostId` | `uuid` FK | Target thread |
| `body` | `text` | Generated + edited |
| `status` | `enum` | `draft`, `pending_review`, `approved`, `sent`, `rejected` |
| `aiModel` | `varchar(50)` | e.g. `claude-sonnet-4-20250514` |
| `productMention` | `boolean` | Flagged for compliance |
| `sentAt` | `timestamptz` | |
| `redditCommentId` | `varchar(20)` | |

#### `analyticsEvents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `entityType` | `enum` | `post`, `comment` |
| `entityId` | `uuid` | |
| `eventType` | `enum` | `sent`, `view`, `upvote`, `reply` |
| `value` | `integer` | Count or delta |
| `recordedAt` | `timestamptz` | |

#### `rateLimitLogs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `teamId` | `uuid` FK | |
| `action` | `varchar(50)` | `comment`, `post`, `scrape` |
| `count` | `integer` | Rolling window count |
| `windowStart` | `timestamptz` | |

---

## 4. Authentication Flow

RedPulse uses **Auth.js v5** (`@auth/core`) with the Next.js App Router adapter.

### 4.1 Providers

1. **Credentials** — email/password with bcrypt (cost factor 12).
2. **Google OAuth** — standard OIDC; links to existing user by email.
3. **Reddit OAuth** — separate connect flow for posting (stored in `accounts`).

### 4.2 Session Model

- **Strategy:** JWT in HTTP-only cookie (`__Secure-authjs.session-token` in production).
- **Session payload:** `{ userId, email, activeTeamId, role }`.
- **Team context:** User selects active team; stored in session and validated on every tRPC call.

### 4.3 Auth Flow Diagram

```
Sign Up (email)
  → POST /api/auth/signup
  → Hash password, insert user + default team
  → Send verification email
  → Redirect to /onboarding

Sign In (Google)
  → GET /api/auth/signin/google
  → OAuth callback → upsert user
  → Redirect to /dashboard

Connect Reddit (in-app)
  → GET /api/reddit/connect?teamId=...
  → Reddit OAuth (scope: submit, read, identity)
  → Encrypt tokens → upsert accounts row
  → Redirect to /settings/integrations
```

### 4.4 Middleware

`src/middleware.ts` protects `/dashboard/*`, `/settings/*`, and tRPC routes. Public routes: `/`, `/pricing`, `/blog`, `/api/auth/*`.

---

## 5. tRPC API Surface

Router namespace: `src/server/api/root.ts`. All mutations require `protectedProcedure`; team-scoped procedures use `teamProcedure` middleware that validates membership and role.

### 5.1 Router Overview

| Router | Procedures | Min Role |
|--------|------------|----------|
| `user` | `getProfile`, `updateProfile` | viewer |
| `team` | `create`, `list`, `invite`, `removeMember`, `updateRole` | admin |
| `reddit` | `connect`, `disconnect`, `listAccounts`, `refreshToken` | editor |
| `scrape` | `listJobs`, `trigger`, `cancel`, `getIpHealth` | admin |
| `filters` | `list`, `create`, `update`, `delete` | editor |
| `discovery` | `listPosts`, `getPost`, `refresh` | viewer |
| `ai` | `generateReply`, `regenerate`, `updateDraft` | editor |
| `comments` | `list`, `approve`, `reject`, `send` | editor |
| `posts` | `create`, `schedule`, `publish`, `list`, `delete` | editor |
| `analytics` | `overview`, `timeseries`, `export` | viewer |
| `safety` | `getBanRisk`, `getRateLimitStatus` | viewer |

### 5.2 Key Procedure Signatures

```typescript
// discovery.listPosts
input: z.object({
  teamId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  subreddit: z.string().optional(),
  keyword: z.string().optional(),
})
output: { items: DiscoveredPost[], nextCursor?: string }

// ai.generateReply
input: z.object({
  discoveredPostId: z.string().uuid(),
  tone: z.enum(['helpful', 'casual', 'technical']).default('helpful'),
  productContext: z.string().max(500),
  mentionProduct: z.boolean().default(true),
})
output: { commentId: string, body: string, banRiskScore: number }

// posts.schedule
input: z.object({
  postId: z.string().uuid(),
  scheduledAt: z.date().optional(), // omit = auto optimal time
  subreddit: z.string(),
})
output: { postId: string, scheduledAt: Date, optimalSlotReason: string }

// analytics.overview
input: z.object({ teamId: z.string().uuid(), range: z.enum(['7d','30d','90d']) })
output: {
  messagesSent: number,
  postsPublished: number,
  totalViews: number,
  engagementRate: number,
  avgBanRiskScore: number,
}
```

### 5.3 Error Handling

Standard tRPC error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `TOO_MANY_REQUESTS`, `BAD_REQUEST`. Rate-limit violations return `TOO_MANY_REQUESTS` with `Retry-After` in response headers.

---

## 6. Feature Implementation

### 6.1 Reddit Scraping

Read-only scraping via **snoowrap** (Node.js) or **PRAW** (Python worker). No official Reddit API required for data collection; OAuth remains available separately for authenticated posting workflows.

#### 1. Library selection (read-only)

- Use **snoowrap** or **PRAW** for read-only scraping
- Both libraries work without authentication for public data
- They handle rate limiting and retries automatically

#### 2. Real-time scraping

- Use the `LiveThread` feature in snoowrap or the `stream` module in PRAW
- Subscribe to new posts and comments in target subreddits
- Filter them by keywords, author, score, and other criteria
- Pause the stream when rate limits are reached

#### 3. Historical batch scraping

- Use the `search` and `top` methods in snoowrap/PRAW
- Retrieve top posts and comments for a given time period
- Useful for initial data collection and analysis

#### 4. Metadata extraction

Extract and normalize the following fields from each scraped item:

| Entity | Fields |
|--------|--------|
| **Post** | title, body, author, score, timestamp, URL |
| **Comment** | body, author, score, parent post |
| **Subreddit** | name, subscriber count, description |

#### 5. PostgreSQL persistence

- Store scraped data in dedicated `discoveredPosts` and `comments` tables (see §3.2)
- Include all relevant metadata fields
- Add indexes on fields used for filtering: `subreddit`, `author`, `matchedKeywords`, `discoveredAt`, GIN index on full-text search columns

#### 6. Recurring scrape jobs

- Use a background job system such as **Bull** or **Agenda** (Redis-backed; compatible with Upstash)
- Schedule jobs for real-time streams and batch backfills per team `keywordFilters`
- Persist job state in Redis for fault tolerance (idempotency keys, retry counts, last cursor)

**Suggested job types:**

| Job | Schedule | Mode |
|-----|----------|------|
| `scrape:stream` | Continuous / long-running worker | LiveThread / PRAW stream |
| `scrape:batch` | Cron (e.g. every 6h) | `search` / `top` backfill |
| `scrape:sync-metadata` | Daily | Subreddit subscriber counts, descriptions |

#### 7. IP health & proxy rotation

- Track request success rates and HTTP error codes per egress IP
- If an IP is rate-limited or blocked, rotate to a new proxy automatically
- Integrate a proxy rotation service (e.g. Bright Data, Oxylabs) via env-configured proxy pool
- Expose IP health metrics in Redis (`scrape:ip:{id}:errors`, rolling window)

#### 8. Admin scrape dashboard

Provide an admin view (role: `admin`+) for operational monitoring:

- Job status, scraped item counts, error rates per subreddit
- Manual trigger and cancellation of scrape jobs
- IP health metrics and proxy pool settings

**tRPC procedures (proposed):**

| Procedure | Description |
|-----------|-------------|
| `scrape.listJobs` | List active/completed jobs with status |
| `scrape.trigger` | Manually start a batch or stream job |
| `scrape.cancel` | Cancel a running job |
| `scrape.getIpHealth` | Return success rate, error codes, active proxy |

> By focusing on read-only scraping with robust libraries, error handling, job scheduling, and IP management, RedPulse can reliably collect Reddit data at scale without the official API. This approach is used by many Reddit analysis tools and carries minimal ban risk when done respectfully (rate limits, no auth evasion, public data only).

### 6.2 AI Reply Generation

1. Client calls `ai.generateReply` with post context + product brief from team settings.
2. Server builds prompt: post title/body, subreddit rules snippet, tone, anti-spam guidelines.
3. **Anthropic Messages API** (`claude-sonnet-4-20250514`): max 300 tokens, temperature 0.7.
4. Post-generation **safety pipeline:**
   - Link density check (max 1 URL)
   - Promotional language score
   - Subreddit rule keyword blocklist
   - **Ban risk score** (0–1): weighted heuristics + optional Claude self-assessment
5. Draft saved to `comments` with `pending_review` if score > 0.6; else `draft`.

### 6.3 Optimal Scheduling

- Historical engagement data per subreddit stored in `analyticsEvents`.
- Optimal slots computed: top 3 UTC hours by avg upvotes (rolling 30d); fallback to subreddit peak defaults (weekday 9–11 AM, 7–9 PM local approximation).
- `posts.schedule` without `scheduledAt` assigns next available slot respecting team daily post cap.

### 6.4 Anti-Spam & Rate Limiting

| Action | Limit | Window | Store |
|--------|-------|--------|-------|
| Comments sent | 10/team | 1 hour | Upstash sliding window |
| Scrape requests | 30/IP | 1 minute | Upstash + proxy pool |
| Posts published (OAuth) | 3/team | 24 hours | Upstash |
| AI generations | 50/team | 24 hours | Upstash |

**Ban risk factors:** account age, karma ratio, comment frequency, duplicate phrasing (Levenshtein > 0.85), subreddit strictness tier.

---

## 7. Frontend & Design System

### 7.1 Stack

- **Tailwind CSS** with CSS variables in `globals.css`
- **shadcn/ui** (Radix primitives)
- **class-variance-authority** + **tailwind-merge** via `cn()` utility
- **Framer Motion** for scroll-triggered animations (landing page)
- **Inter** via `next/font/google`

### 7.2 CSS Variables

```css
:root {
  --background: 0 0% 4%;
  --foreground: 0 0% 98%;
  --card: 0 0% 7%;
  --primary: 24 95% 53%;        /* orange accent */
  --primary-foreground: 0 0% 100%;
  --muted: 0 0% 15%;
  --border: 0 0% 18%;
  --radius: 0.5rem;
  --spacing-section: 6rem;
}
```

### 7.3 Landing Page Sections

1. **Hero** — headline, subcopy, primary CTA, product mockup/video (lazy-loaded WebM)
2. **Features** — 4-column grid with icons
3. **Product shots** — carousel with subtle parallax
4. **Testimonials** — 3 cards, star ratings
5. **Pricing** — Free / Pro ($49/mo) / Enterprise; feature comparison table
6. **CTA banner** — full-width orange gradient, "Start free trial"
7. **Footer** — links, legal, social

Animations: `whileInView` fade-up (opacity 0→1, y 24→0), stagger 0.1s. Respect `prefers-reduced-motion`.

### 7.4 Accessibility

- WCAG AA contrast (4.5:1 body, 3:1 large text)
- Focus rings on all interactive elements
- Skip-to-content link, semantic landmarks, ARIA labels on icon buttons
- Keyboard navigable modals (Radix Dialog trap focus)

---

## 8. Environment Variables

Store in Vercel project settings and `.env.local` (never commit):

```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=                    # openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ENCRYPTION_KEY=                 # 32-byte hex for token encryption
```

---

## 9. Deployment

### 9.1 Vercel

- **Framework preset:** Next.js
- **Build:** `pnpm build`
- **Regions:** `iad1` (primary), edge for static assets
- **Cron jobs** (`vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/scrape", "schedule": "*/2 * * * *" },
    { "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" },
    { "path": "/api/cron/sync-analytics", "schedule": "0 */6 * * *" }
  ]
}
```

### 9.2 Railway PostgreSQL

- Enable connection pooling (PgBouncer mode: transaction)
- Run migrations via CI: `pnpm drizzle-kit push` or `migrate` on deploy
- Backups: Railway automatic daily snapshots

### 9.3 CI/CD Pipeline

```
push to main
  → GitHub Actions: lint, typecheck, test
  → drizzle-kit migrate (production DATABASE_URL)
  → Vercel auto-deploy
  → Post-deploy smoke: GET /api/health
```

---

## 10. Project Structure

```
redpulse/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing, pricing, blog
│   │   ├── (dashboard)/          # Authenticated app shell
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── trpc/[trpc]/
│   │   │   └── cron/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn
│   │   └── dashboard/
│   ├── server/
│   │   ├── api/routers/
│   │   ├── db/schema/
│   │   ├── reddit/
│   │   ├── ai/
│   │   └── auth/
│   ├── lib/
│   │   ├── redis.ts
│   │   ├── encryption.ts
│   │   └── utils.ts
│   └── trpc/
├── drizzle/
├── public/
└── drizzle.config.ts
```

---

## 11. Security Considerations

- Encrypt Reddit OAuth tokens at rest (AES-256-GCM)
- Never log tokens, passwords, or API keys
- CSRF protection via Auth.js; SameSite=Lax cookies
- Input sanitization on all user-generated content before Reddit submission
- Row-level team isolation enforced in every DB query (`where eq(table.teamId, ctx.teamId)`)
- Audit log (future): `auditEvents` table for compliance

---

## 12. MVP Milestones

| Phase | Deliverables | Timeline |
|-------|--------------|----------|
| **M1** | Auth, teams, DB schema, landing page | Week 1–2 |
| **M2** | Reddit scraping (snoowrap), keyword filters, discovery feed, scrape jobs | Week 3–4 |
| **M3** | AI reply generation, review queue, send flow | Week 5–6 |
| **M4** | Scheduling, analytics dashboard, rate limits | Week 7–8 |
| **M5** | Polish, billing (Stripe), production hardening | Week 9–10 |

---

*This specification is the source of truth for RedPulse v1. Implementation PRs should reference section numbers when introducing architectural changes.*
