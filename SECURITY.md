# Cloud security model

Every private HTTP route verifies the Supabase user server-side. The workspace requires authentication. Mutations enforce same-origin browser requests and a 64 KB body limit. Write requests are limited to 30 per minute per account; research starts to 50 per day. Provider vaults allow 20 configurations per account.

Database queries run under the PostgreSQL `authenticated` role with transaction-local verified account claims. Every Atlas table has enforced row-level ownership policies. Composite foreign keys prevent attaching one account's records to another account's project or session. The `atlas` schema is not exposed through the Data API. Anonymous database access is revoked.

`DATABASE_URL` is a server secret with broad database privileges; runtime queries immediately switch to the restricted role inside each transaction. Never give database credentials to the browser. The publishable Supabase key is intended for browser use. TLS certificate verification is enabled for database connections.

AI credentials are encrypted using AES-256-GCM with a stable `ATLAS_MASTER_KEY`, decrypted only inside the server, and omitted from browser responses, exports, prompts, and Workflow arguments. Keep the master key in Vercel environment secrets and a private backup. Losing it requires users to re-enter their AI keys. Environment-wide model keys are intentionally not shared with public accounts.

Only approved hosted HTTPS origins are allowed for provider calls. Redirects are rejected. An administrator can explicitly add trusted origins; do not allow hosts that resolve to internal services. Provider error messages redact supplied credentials. Source URLs are accepted only from provider evidence metadata, not invented synthesis links. Source metadata is provenance, not an independent guarantee of factual accuracy.

Research results and filing decisions commit atomically. Durable jobs checkpoint each stage; duplicate results are suppressed. Job generations invalidate abandoned workflows. A provider call that completed just before a worker failure may need to be repeated if its response was not saved.

Authentication security, SMTP delivery, email verification, rate limits, CAPTCHA configuration, backups, and project access must also be configured in Supabase. Public signup needs a tested email delivery service. Hosting operators and project administrators can access server-side infrastructure; this is account isolation, not end-to-end encryption.
