# Atlas Universal Research OS — Cloud Edition

A private AI research workspace for every account, with your existing cinematic homepage and editorial workspace design.

**Stack:** Next.js 16, Supabase Auth + PostgreSQL, Vercel Workflow. No paid Render database is required.

Start with **[CLOUD_SETUP.md](CLOUD_SETUP.md)**. It includes Supabase setup, Vercel deployment, importing existing local research, and the final live verification checklist.

```bash
npm install
npm run setup
npm run doctor
npm run dev -- --port 3211
```

The homepage opens first. Website-to-workspace navigation retains the 0.8-second reveal; internal workspace navigation remains immediate. An account is required to enter the online workspace.

## Included

- Email signup, email confirmation, sign-in, password reset, and sign-out.
- Account-owned research projects, folders, approvals, memory, history, notifications, and encrypted provider vaults.
- Provider-independent evidence and synthesis with explicit capability limitations and automatic failover.
- Contextual filing of findings and sources; uncertain items await human approval.
- PostgreSQL full-text search, paginated history and search, remembered human decisions.
- Background jobs with durable checkpoints, pause, continuation, interrupted-run recovery, and duplicate suppression.
- Private Markdown/JSON research documents in PostgreSQL and a portable account export.
- SQL migration, local-research import utility, environment template, deployment instructions, and cloud verification suite.

## Commands

`npm run doctor`: TypeScript checks + PostgreSQL/workflow tests using fixture AI responses, without real keys.

`npm run build`: production build, including durable Workflow routes.

`npm run preflight`: configuration presence check; never prints secrets.

`npm run import:local -- /path/to/atlas.db`: dry-run import counts; see setup guide before applying.

This code builds without Supabase credentials and shows a setup screen until configured. A successful local build does not mean the database or deployment has been connected. See VERIFICATION.md for the exact verification status.

## Sign-in without an email sender

Google sign-in is the default for this edition. Follow [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md). A Google account is required until optional email/password access is enabled with a working SMTP sender. Google client setup and a live sign-in test are required; the button stays disabled until marked ready.
