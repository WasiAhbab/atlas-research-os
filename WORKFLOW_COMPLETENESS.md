# Feature coverage in the cloud edition

- Instruction-driven research: topic and instructions retained on every session.
- Organization: findings and source resources receive contextual hierarchical filing proposals.
- Human approval: uncertain classifications wait in Approvals; decisions become memory.
- Capabilities: provider metadata and limitations explain native search support and unavailable actions.
- Limitations: persisted issues and in-app notifications, including queue/worker failures.
- Search: ranked PostgreSQL search across research, sources, folders, history, and decisions.
- History: paginated sessions, activity, and provider-call telemetry.
- Resume: saved evidence/synthesis/result checkpoints; completed sessions continue in linked new sessions.
- Memory: relevant project history and human decisions are recalled in future research.
- Traceability: source metadata allow-list, timestamps, logs, checkpoints, approvals, and exports.
- Public signup: Supabase Auth, private database ownership policies, private provider keys.
- Cloud durability: Supabase persistence plus Vercel Workflow; no dependency on local filesystem persistence.

Scope limits: in-app notifications (no email/push alerts); source metadata is not independent fact verification; unfinished provider calls can repeat after a crash; no local-model connectivity from Vercel; external authentication, SMTP, queue and live-model behavior need a configured end-to-end smoke test. See VERIFICATION.md for what has actually been checked.
