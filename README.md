# Project Maria

Maria is an event-first social discovery website: discover an event, find people interested in the same plan, and coordinate going together.

## Current implementation

The `build/mvp-foundation` branch contains:
- Responsive React/Vite landing page and event discovery with search/category filters.
- Event details, responsive navigation, and a Supabase-backed feed for published future events when the project is configured; sample listings remain as a preview fallback.
- Signed-in account and event-interest UI; the database blocks participation, attendee discovery, groups, messaging, and matching until adult eligibility has been confirmed through a trusted server-side process.
- Adult verification defaults to false and cannot be set by a normal browser session. A real verification workflow is not implemented; do not manually mark ordinary accounts verified.
- Safety guidance, community guidelines, and draft Terms and Privacy pages.
- Sign-up/login UI with optional Supabase Auth integration.
- Supabase Auth password recovery: request a reset email, return to an allowlisted app origin, handle the recovery session, then show the `#reset-password` form to update the password.
- Account deletion via a Supabase Edge Function that validates the signed user JWT in its handler, checks recent password reauthentication, requires explicit `DELETE` confirmation, and keeps privileged keys server-side.
- Signed-in users can edit their own display name, bio, and city through the RLS-protected profiles table.
- Supabase/Postgres schema migrations for profiles, events, participation, swipes, matches, groups, messages, blocks, reports, terms acceptance, RLS, event-scoped swipe/match RPC, and basic swipe rate limiting.
- CI workflow for a production frontend build.

**This is still a prototype, not a production-ready service.** If Supabase is configured and has published future events, the website loads those listings; otherwise it uses sample listings. Saved published events are stored per signed-in user; sample-event saves remain temporary preview state. Adult eligibility is fail-closed in the database, with all profiles unverified by default. There is no production adult-verification workflow, so participation and user-to-user social features are intentionally unavailable until a trusted verification process is implemented and reviewed. Safety reports for published events and attendee profiles can be saved to the database, but moderator queues, notifications, and response SLAs are not implemented. Messaging UI, moderator operations, and comprehensive rate limits remain unfinished. Account deletion is implemented in the UI and Edge Function; a destructive test against an actual account has intentionally not been run.

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

1. Create a separate Supabase development project first; never test migrations against production accounts or data. Open the development project's SQL Editor.
   - Start with migration `202610240001_initial_schema.sql` and run every migration in `supabase/migrations/` from oldest to newest.
   - Run one migration at a time. Do not continue after an error; correct the migration or project setup and rerun it before moving forward.
   - Do not run `supabase db push` without linking and reviewing the migration history first. Supabase dashboard migration history can differ from repository filenames.
   - Test signup, login, profile updates, saved events, event submissions, reports, blocks, and account deletion in the development project only.
   - Confirm Auth email confirmation, redirect URLs, password policy, and abuse protection in the development project before applying equivalent settings to production.
   - After development tests pass, repeat migrations and settings in the production project using controlled change records and backups.

Apply migrations in timestamp order from `supabase/migrations/` in a development project first. Review and test every RLS policy and RPC before production.
   - Migration `202610240007_participation_policy_hardening.sql` introduces a default-false adult eligibility flag and allows participation only for verified adults attending published upcoming events.
   - Migration `202610240008_data_api_table_grants.sql` explicitly grants only the browser operations covered by RLS; grants determine whether a role can reach a table, while RLS determines which rows it can access.
   - Migration `202610240009_adult_verification_gate.sql` limits profile discovery, participant access, group membership, messaging, and match visibility to eligible adult users and preserves block checks.
   - Migration `202610240010_security_permissions_and_active_discovery.sql` removes broad default Data API grants, restricts trigger-only function execution, and limits profile discovery and social operations to published upcoming events.
   - Migration `202610240011_saved_events.sql` adds an RLS-protected saved-event list per authenticated user.
   - Migration `202610240012_private_rls_helpers.sql` moves RLS-only security-definer helpers into a non-exposed schema and leaves only the intended group-join and event-swipe RPCs callable by signed-in clients.
   - Migration `202610240013_foreign_key_indexes.sql` adds indexes for foreign-key lookups highlighted by Supabase's performance advisor.
   - Migration `202610240014_rls_initplan_optimization.sql` updates remaining ownership/admin policies to evaluate `auth.uid()` once per statement, preserving their existing access rules.
2. In **Authentication → URL Configuration**, keep the Site URL set to the actual deployed app URL and add the development and production app URLs to Redirect URLs. Include `http://localhost:5173/**` for local Vite development and the actual production origin with `/**`; do not allow arbitrary external domains. The recovery link returns to the app origin so Supabase can process the recovery token; the app then switches to its internal `#reset-password` page.
3. Configure email confirmation, password policy, Auth abuse protection, backups, and monitoring. Confirm the project can deliver recovery emails before relying on password resets.
4. The `delete-account` Edge Function handles CORS preflight and validates the signed user JWT inside the handler. Its gateway `verify_jwt` check is disabled so browser `OPTIONS` requests can reach the handler; unauthenticated requests still fail the handler's token validation. Deletion requires a fresh password-authentication method and exact `DELETE` confirmation, revokes refresh sessions where possible, then calls the Auth admin API. Its privileged secret is read only from the server-side Edge Function environment.
5. Provision admin access only through trusted server-side tooling. Never expose a Supabase service-role key in a `VITE_*` variable or client bundle.

The connected Supabase project currently has migrations 001–014 applied. The 13 application tables have RLS enabled and are empty; adult eligibility is false by default, and live attendee discovery, participation, matching, groups, and messaging remain fail-closed until a trusted verification workflow exists. The schema is not a production launch: authentication redirect/email settings, hosting, moderation, and end-to-end tests still need work. The Supabase connector records server-generated migration version IDs that differ from this repository's filename prefixes; reconcile local and remote migration history before using the Supabase CLI to push further migrations, and do not run a blind `db push`.

## Security and traffic control

The database includes RLS policies, event-scoped swipe/match logic, block-aware checks, group membership helpers, and a basic limit of 30 swipe attempts per authenticated user per minute. This is only a starting layer. Before launch, add edge/WAF/IP rate limits, abuse controls for messages/reports/authentication/group creation, moderation workflows, security monitoring, and end-to-end tests. Read [the security and launch checklist](docs/SECURITY_AND_LAUNCH_CHECKLIST.md).

Never rely on client-side checks for authorization. Use Postgres RLS and trusted server-side functions.

## Quality checks

- `npm run build` runs the Vite production build.
- `npm test` runs Node test files; meaningful automated tests still need to be added.
- The CI workflow checks the frontend build; it does not validate SQL migrations, security policies, or real user flows.

Do not interpret a successful frontend build as proof of security or end-to-end correctness. The Terms and Privacy pages are drafts and require review by qualified counsel for the actual operator, launch jurisdiction, and live data practices.
