# RedPulse — Product Specification

**Version:** MVP 1.0 · June 2026

## Objective

SaaS tool helping businesses generate leads on Reddit by detecting relevant conversations and providing personalized response suggestions.

## Feature Matrix

| Feature | Status | Route / API |
|---------|--------|-------------|
| Dashboard KPIs + period filter | ✅ | `team.getOverview({ period })` |
| KPI evolution (week / month / all) | ✅ | Dashboard charts |
| Section shortcuts | ✅ | Dashboard quick links |
| Warmup — popular posts | ✅ | `warmup.getSuggestions` |
| Warmup — generic AI responses | ✅ | `warmup.generateResponse` |
| Response — keyword-matched list | ✅ | `discovery.list` (by relevance) |
| Response — personalized AI | ✅ | `comments.generateAndDraft` |
| DM follow-up | ✅ | `dm.*` + `/dashboard/replies` DM tab |
| Team list + invite | ✅ | `team.listMembers`, `team.inviteMember` |
| Member activity (replies + DMs) | ✅ | `team.listMembers` |
| Settings — account | ✅ | `user.updateProfile`, `user.changePassword` |
| Settings — subreddits / keywords | ✅ | `settings.updateFilters` |
| Settings — alert frequency | ✅ | `settings.updateAlerts` |
| Settings — response templates | ✅ | `settings.*Template` |

## User Journey

1. Create project (website URL) → onboarding + signup
2. Configure subreddits, keywords, templates → Settings
3. Detect conversations → Listen (cron + manual scrape)
4. Warm up accounts → Warmup mode
5. Respond to prospects → Publish + editor
6. Follow up via DM → DM tab

## Technical Stack (implemented)

| Spec | Implementation |
|------|----------------|
| Next.js on Vercel | ✅ App Router |
| PostgreSQL | ✅ Drizzle + Railway |
| Reddit data | ✅ Reddit JSON API + OAuth (PRAW spec → Node equivalent) |
| AI responses | ✅ Anthropic Claude |
| OAuth auth | ✅ NextAuth (Google + credentials) |
| Tailwind UI | ✅ Dark theme design system |

## Milestones (roadmap)

1. ✅ Dev environment + schema
2. ✅ Auth + team management
3. ✅ Reddit scraper + detection
4. ✅ Response generation module
5. ✅ Analytics + reporting
6. ✅ UI implementation
7. 🔄 E2E testing (beta)
8. ⏳ Beta launch
9. ⏳ Feedback iteration
10. ⏳ Public launch
