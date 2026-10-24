# Project Maria

Maria is an event-first social discovery website: discover an event, find people interested in the same plan, and coordinate going together.

## Current implementation

The `build/mvp-foundation` branch contains:
- Responsive React/Vite landing page and event discovery with search/category filters.
- Event details, responsive navigation, and a Supabase-backed feed for published future events when the project is configured; sample listings remain as a preview fallback.
- Signed-in users can mark interest in published events; participation writes are protected by RLS policies. The interface explicitly notes that participant discovery and matching are not yet connected.
- Safety guidance, community guidelines, and draft Terms and Privacy pages.
- Sign-up/login UI with optional Supabase Auth integration.
- Supabase/Postgres schema migrations for profiles, events, participation, swipes, matches, groups, messages, blocks, reports, terms acceptance, RLS, event-scoped swipe/match RPC, and basic swipe rate limiting.
- CI workflow for a production frontend build.

**This is still a prototype, not a production-ready service.** If Supabase is configured and has published future events, the website loads those listings and persists event interest; otherwise it uses sample listings. Saved events are in-memory only. The website's reporting UI is not connected to the reports table or a moderator queue. Real event discovery, persistent saved events, matching UI, group join UI, messaging UI, profile editing, account deletion, password recovery, moderation operations, and comprehensive rate limits are not implemented.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Without environment variables, the UI runs in preview mode and authentication intentionally does not pretend to create real accounts.

## Supabase setup

1. Create a Supabase project for development.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and the deployment provider.
3. Apply migrations in timestamp order from `supabase/migrations/` in a non-production project first. Review and test every RLS policy and RPC before production.
4. Configure email confirmation, allowed redirect URLs, password policy, Auth abuse protection, backups, and monitoring.
5. Provision admin access only through trusted server-side tooling. Never expose a Supabase service-role key in a `VITE_*` variable or client bundle.

The database migrations have been committed to the repository, including a policy hardening migration that restricts participation writes to published upcoming events. They **have not been applied to a Supabase project or tested against a live database**. Do not assume that the backend is live.

## Security and traffic control

The database includes RLS policies, event-scoped swipe/match logic, block-aware checks, group membership helpers, and a basic limit of 30 swipe attempts per authenticated user per minute. This is only a starting layer. Before launch, add edge/WAF/IP rate limits, abuse controls for messages/reports/authentication/group creation, moderation workflows, security monitoring, and end-to-end tests. Read [the security and launch checklist](docs/SECURITY_AND_LAUNCH_CHECKLIST.md).

Never rely on client-side checks for authorization. Use Postgres RLS and trusted server-side functions.

## Quality checks

- `npm run build` runs the Vite production build.
- `npm test` runs Node test files; meaningful automated tests still need to be added.
- The CI workflow checks the frontend build; it does not validate SQL migrations, security policies, or real user flows.

Do not interpret a successful frontend build as proof of security or end-to-end correctness. The Terms and Privacy pages are drafts and require review by qualified counsel for the actual operator, launch jurisdiction, and live data practices.
