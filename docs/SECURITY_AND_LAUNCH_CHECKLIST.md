# Security and launch checklist

This checklist is intentionally conservative. A successful frontend build does not establish production security.

## Database setup

1. Apply migrations in timestamp order using the Supabase CLI or SQL editor in a non-production project first.
2. Review the SQL against the product's actual data flows and run the security checks below before applying to production.
3. Keep event publishing/admin provisioning server-side. Never give browser clients a service-role key.
4. Enable email confirmation, configure allowed redirect URLs, password policy, and Auth abuse protection.
5. Configure backups, retention, error monitoring, and an incident response contact.

## Security test matrix

- Anonymous users cannot read profiles, event participants, matches, groups, messages, blocks, or reports.
- A signed-in user can only update their own profile; they cannot change privileged admin or suspension fields.
- A user cannot create a match by inserting into matches or a swipe by inserting into swipes directly.
- The record_event_swipe RPC rejects unauthenticated calls, self-swipes, users not participating in the event, suspended users, unpublished events, and blocked pairs.
- Mutual likes create at most one match for the same pair and event.
- A blocked pair cannot swipe or exchange messages.
- Group joining requires event participation, rejects blocked pairs, and cannot exceed the configured group size under concurrent requests.
- Users can only read messages for conversations they belong to.
- Reports are insertable by a signed-in reporter but visible to that reporter and authorized moderators only.
- Rate limits are tested from multiple sessions and from a single session; abuse monitoring alerts are configured.

## Traffic control

The initial migration adds a database rolling-window limit for event swipes (30 attempts per minute per authenticated user). It is not a complete anti-abuse system. Before launch, add:
- Supabase Auth abuse protection and CAPTCHA where appropriate.
- Edge/WAF/IP rate limits for public endpoints and authentication.
- Rate limits for messages, reports, group creation, and account recovery.
- Request-size limits, pagination limits, server-side validation, and database statement timeouts.
- Monitoring for repeated failed logins, spam, reports, and abnormal matching activity.

Do not trust browser-side checks as authorization. Enforce access in Postgres RLS and trusted server-side functions.

## Age policy and in-person safety

- Decide and publish a minimum-age policy before public launch. Because the service introduces people for in-person meetups, an initial 18+ MVP with an appropriate age gate is the safer default to evaluate.
- Do not allow adults and minors to be matched together. If the product is intended to support minors, do not launch that flow without separate age cohorts, stronger safeguarding, a qualified legal review, and a moderation/incident response process designed for minors.
- A date-of-birth field or self-attestation alone is not strong age verification. Select controls proportionate to the risks and applicable law while minimizing collection of sensitive identity data.

## Product and operations

- Implement an actual moderator queue and documented escalation/appeals process.
- Confirm report submissions are persisted and reviewed; a report form without a working moderation path is not a safety system.
- Provide a working block flow and ensure it affects discovery, matches, groups, and messages.
- Implement account deletion, data access/export handling, privacy retention, and versioned terms acceptance.
- Replace demo events with a trusted feed and validate outbound booking URLs.
- Add end-to-end tests for every primary navigation link and critical user flow.
- Have qualified counsel review Terms and Privacy Policy for the operator, launch jurisdiction, and real data practices.

## Deployment gate

Do not describe Maria as production-ready until database migrations have been applied and tested, secrets and redirects are configured, all critical flows pass automated tests, monitoring is active, and a real moderation owner is available.
