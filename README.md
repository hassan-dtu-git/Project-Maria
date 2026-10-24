# Project Maria

Maria is an event-first social discovery website: discover an event, find people interested in the same plan, and coordinate going together.

## Current branch

The `build/mvp-foundation` branch contains the first React/Vite website foundation:
- Responsive landing page and event discovery with category/search filters.
- Event detail modal and locally saved events.
- How-it-works, safety, community guidelines, terms, and privacy pages.
- Sign-up/login screens with optional Supabase Auth wiring.
- Basic UI reporting flow, clearly marked as a non-persisted prototype.
- Responsive layout, focus-visible styles, and reduced-motion support.

**This is a prototype, not a production-ready service.** Event listings are sample data. Saved events are in-memory only. Reporting is not delivered to moderators. Matching, group membership, chat, account deletion, email recovery, moderation operations, and rate limiting are not implemented yet.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Without environment variables, the UI runs in preview mode and authentication intentionally does not pretend to create real accounts.

## Supabase Auth configuration

Set the following in `.env.local` and your deployment provider:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use only the public anon/publishable key in browser code. **Never expose a Supabase service-role key in a `VITE_*` variable or client bundle.** Configure email confirmation, password policy, redirect URLs, abuse protection, and database Row Level Security in Supabase before production use.

## Required before public launch

1. Design and apply database migrations for profiles, events, event participation, likes, matches, groups, memberships, messages, blocks, reports, and moderation actions.
2. Enforce all ownership, match, group, and message access rules in Postgres RLS and trusted server-side functions; never trust client checks alone.
3. Add server-side rate limits for authentication-sensitive actions, likes, messages, report submissions, and event creation; configure hosting/WAF limits and monitoring.
4. Implement real match creation, block enforcement, report persistence, moderation queues, audit logs, and escalation/retention policies.
5. Implement profile editing, account deletion/export requests, password reset, email verification, and consent/version records for terms.
6. Replace sample events with a verified event source and validate all outbound links.
7. Add automated unit/integration/e2e tests, dependency/security scans, accessibility checks, and CI deployment gates.
8. Have qualified counsel review Terms and Privacy Policy for the actual operator, markets, and data practices.

## Quality checks

`npm run build` runs the Vite production build. `npm test` is reserved for Node test files; meaningful tests still need to be added. Do not interpret a successful frontend build as proof of security or end-to-end correctness.
