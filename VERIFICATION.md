# Verification — October 1, 2026

## Passed locally

- TypeScript validation (`npm run typecheck`).
- Production build with Next.js and generated Vercel Workflow routes (`npm run build`).
- Dependency audit: zero known vulnerabilities at packaging time. A patched nanoid override is pinned for the Workflow dependency chain.
- 18 automated cloud checks against the real PostgreSQL schema using PGlite, with deterministic mock AI responses:
  1. Row-level security is enabled and forced on all 19 Atlas tables.
  2. Database operations reject a missing account identity.
  3. Private workspace bootstrap is idempotent and does not add fake research.
  4. Queued demo stages save atomically; duplicate starts are rejected; documents persist.
  5. Finding approval updates folders, search, documents, and remembered decisions.
  6. PostgreSQL search returns ranked, relevant results.
  7. Encrypted provider secrets round-trip; public responses omit secrets.
  8. A second account cannot read, search, modify, attach records to, or run the first account's research.
  9. Cloud endpoint rules reject private/deceptive URLs.
  10. Evidence and synthesis execute in separate invocations; invented URLs are rejected; resources require approval when uncertain.
  11. Pause/resume reuses saved evidence, preserves continuation history, invalidates old workers, and suppresses duplicate findings.
  12. Invalid synthesis receives one repair call and saves the repair.
  13. Abandoned jobs become interrupted and create an owner notification.
  14. A failed result commit rolls back findings, folders, and logs.
  15. Search pagination returns all 70 fixture records across pages.
  16. Automatic failover advances across invocations, reports the switch, updates provider health, and redacts keys in errors.
  17. Anonymous database roles cannot access Atlas tables.
- Browser inspection: homepage renders; direct workspace entry redirects to the account/setup page when cloud configuration is absent.

## Verified against the connected Supabase project

- Connected to Atlas Research OS in Tokyo using its transaction pooler.
- Applied the initial schema; a subsequent run preserved it and confirmed all 19 tables have row-level security enabled.
- Database TLS certificate verification succeeds using the bundled official Supabase root CA.
- Live Google sign-in and workspace creation/save/reload succeeded. A no-key demo research run completed through the actual local Workflow SDK and saved findings, an approval, notifications, and history in Supabase. Two-account browser isolation remains pending; automated PostgreSQL account isolation checks pass.

## Google sign-in update

- Added Google OAuth with PKCE cookie sessions, while retaining optional email/password forms.
- Invalid, external, and malformed callback destinations fall back safely; workspace query context survives redirects.
- Added an automated redirect-security and context-preservation check.
- All 18 automated checks and the production build passed after the Google changes.
- Running localhost checks passed: signed-out state/history/export return 401, malformed return URLs render safely, cancelled OAuth stays on Atlas, and Google-only UI hides email/password.
- Google Cloud project `atlas-research-os`, consent registration, and the Atlas Web OAuth client were created. The localhost origin and Supabase callback are correct. Supabase now permits the exact localhost callback with return-context query parameters. The supplied Google client credential is now connected in Supabase only; it is not stored in source files or the downloadable ZIP. The browser completed Google login, exchanged the callback, and opened the authenticated Atlas workspace. A new Connection check workspace was saved and reloaded successfully from Supabase. Google audience remains Testing; public launch is not yet configured.
- Google requires its own client configuration in Supabase. The button stays disabled until that configuration is marked ready.
- Google sign-in is the selected alternative to the blocked Brevo phone verification. No email confirmation protection was weakened.

## Not yet verified against live services

No Vercel deployment has been made.

Deployed Vercel queue delivery, two-account browser isolation, and a real AI-provider run remain to be checked after setup. SMTP is optional for Google-only login; email/password remains dependent on a working sender. No real AI key was used by automated tests.

The original local project and its database were preserved separately. The cloud ZIP excludes `.env.local`, all credentials, user research data, dependency folders, and generated build output.
