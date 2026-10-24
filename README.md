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

**This is still a prototype, not a production-ready service.** If Supabase is configured and has published future events, the website loads those listings and persists event interest; otherwise it uses sample listings. Saved events are in-memory only. The website's reporting UI is not connected to the reports table or a moderator queue. Event-scoped participant discovery and swipe actions now call the Supabase policies/RPC when configured, but they have not been tested against a live database. Persistent saved events, group join UI, messaging UI, profile editing, account deletion, password recovery, moderation operations, and comprehensive rate limits are not implemented.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Without environment variables, the UI runs in preview mode and authentication intentionally does not pretend to create real accounts.

## Supabase setup

### Configure the app

The repository intentionally does **not** contain `.env.local`. It holds your project-specific configuration and should stay on your own machine, not in Git. The root `.gitignore` now excludes local environment files.

1. In Supabase, open your new Maria project and go to **Project Settings → API Keys**.
2. Copy the **Project URL** and the **Publishable key** (starts with `sb_publishable_`). The legacy `anon` key can also be used with this app.
3. On a computer with the repository checked out, copy `.env.example` to a new file named `.env.local` in the repository root.
4. Put your values in the file using these exact variable names, without adding any other keys:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_replace_with_your_value
   ```

   Replace both example values with the values from your Supabase dashboard. Do not commit `.env.local` or paste a database password, `service_role` key, or `sb_secret_` key into a `VITE_*` variable. Vite-exposed variables are included in the browser bundle; only the Supabase publishable/legacy anon key is suitable here.

5. Restart the Vite development server after changing the file.

If the website is being hosted instead of run locally, add the same two variable names in the hosting provider's **environment variables** settings and trigger a new deployment. Do not create a public GitHub file to store the actual credentials. The repository alone cannot determine which hosting provider/account you use.

### Database setup and launch checks

1. Apply migrations in timestamp order from `supabase/migrations/` in a non-production project first. Review and test every RLS policy and RPC before production.
2. Configure email confirmation, allowed redirect URLs, password policy, Auth abuse protection, backups, and monitoring.
3. Provision admin access only through trusted server-side tooling. Never expose a Supabase service-role key in a `VITE_*` variable or client bundle.

The database migrations have been committed to the repository, including a policy hardening migration that restricts participation writes to published upcoming events. They **have not been applied to a Supabase project or tested against a live database**. Do not assume that the backend is live.

## Security and traffic control

The database includes RLS policies, event-scoped swipe/match logic, block-aware checks, group membership helpers, and a basic limit of 30 swipe attempts per authenticated user per minute. This is only a starting layer. Before launch, add edge/WAF/IP rate limits, abuse controls for messages/reports/authentication/group creation, moderation workflows, security monitoring, and end-to-end tests. Read [the security and launch checklist](docs/SECURITY_AND_LAUNCH_CHECKLIST.md).

Never rely on client-side checks for authorization. Use Postgres RLS and trusted server-side functions.

## Quality checks

- `npm run build` runs the Vite production build.
- `npm test` runs Node test files; meaningful automated tests still need to be added.
- The CI workflow checks the frontend build; it does not validate SQL migrations, security policies, or real user flows.

Do not interpret a successful frontend build as proof of security or end-to-end correctness. The Terms and Privacy pages are drafts and require review by qualified counsel for the actual operator, launch jurisdiction, and live data practices.
