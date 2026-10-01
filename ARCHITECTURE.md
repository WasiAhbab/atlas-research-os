# Atlas Cloud architecture

Browser → Supabase Auth → Next.js private API → transaction-scoped PostgreSQL role + RLS → account-owned Atlas tables.

Research requests reserve a session and job atomically, then dispatch Vercel Workflow. Each step loads the job under its owner's database identity, executes at most one model stage, saves its checkpoint, and yields. The orchestrator schedules the next step without keeping an HTTP request or browser tab open. Normal stage progression is evidence → synthesis → optional JSON repair → validated result → atomic filing. Auto failover yields between failed providers so one invocation cannot exceed its budget by trying every provider.

The durable workflow receives only account/job/generation identifiers. Provider secrets are retrieved inside steps. Queue failures are visible as resumable sessions. Job leases prevent concurrent execution and generations invalidate stale workflows. Jobs idle for more than ten minutes are surfaced as interrupted when State or History is opened.

PostgreSQL owns projects, folders, sessions, findings, resources, both approval queues, decisions, notifications, logs, provider telemetry, encrypted credentials, settings, jobs, and Markdown documents. Generated `tsvector` indexes support ranked search; history and search are paginated. Memory recalls relevant prior project records and filing decisions, with bounded excerpts. It is reference material, not new evidence.

Research finalization is one database transaction, including findings, resources, pending approvals, search entries, notifications, and the completed checkpoint. Markdown/JSON documents are secondary representations; failures are surfaced without losing the authoritative database records. They are stored in PostgreSQL rather than an ephemeral Vercel filesystem.

Key modules: `lib/postgres.ts` (identity and transactions), `lib/auth.ts` (route boundary), `lib/jobs.ts` (queue/session lifecycle), `workflows/research.ts` (durable orchestration), `lib/research.ts` (atomic filing), `lib/universalResearch.ts` (evidence/synthesis), `lib/providers.ts` (adapters and vault), `lib/knowledge.ts` (search/memory), `supabase/migrations/001_atlas.sql` (schema and RLS).
