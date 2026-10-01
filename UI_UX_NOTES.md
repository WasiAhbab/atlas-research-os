# Atlas — refined workspace edition

## Main changes

- Graphite surfaces, restrained lavender gradients, an orbital research graphic, clearer typography, improved spacing and contrast.
- Persistent workspace navigation, dedicated approval inbox with pending count, and provider management placed first in settings.
- Keyboard command palette (Cmd/Ctrl+K, Tab, Enter, Escape), with modal focus containment and focus restoration.
- A focused research composer, explicit demo-mode messaging, preserved in-session drafts when switching pages, and operation-specific progress messages.
- Library folder filtering, full finding content and source links, readable classification confidence, and responsive cards.
- Saved checkpoint stages, visible run errors, continuation controls, activity history and provider telemetry.
- Load retry, request error handling, search race protection, empty states, disabled invalid submissions, visible keyboard focus, and reduced-motion support.
- Mobile navigation scrolls horizontally; workspace selection remains available. Tables scroll within their panels.

## Preserved functionality

The existing provider adapters, encrypted vault, automatic routing, research pipeline, SQLite/FTS5 memory, hierarchical folder filing, Markdown mirroring, approvals, source handling, history, limitations and resume endpoints remain in place. No new third-party runtime dependencies or remote font requests were added.

A database initialization race discovered during the production build was fixed with a SQLite busy timeout, bounded retries for concurrent WAL initialization, and a transaction around initial demo seeding.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed, including a fresh database initialization with multiple build workers.
- `npm run doctor`: passed (runtime, SQLite/FTS5, encryption primitives and required files).
- Browser checks: demo research completion; approval into a new folder; library filter and full-content expansion; Cmd+K palette and navigation; global search returning a matching finding; checkpoint resume with duplicate suppression; workspace creation; provider form and empty state.
- Layout reviewed at desktop and 390px mobile width.
- Live vendor calls were not tested. Bring your own key and use the existing provider Test control before a live demo. Provider presets and model compatibility remain those of the supplied project.

## Start a clean copy

Use Node 22.13 or newer (verification used Node 24.19):

```sh
npm install
npm run setup
npm run doctor
npm run dev
```

Open http://localhost:3000. A clean copy seeds a clearly labeled demo workspace. Add a provider under **Providers & settings** for live research.

## Keep existing research and credentials

The delivery archive excludes local credentials, databases, generated Markdown, dependencies and build output. Keep the original installation backed up. To retain its data, stop the app, copy its `data/` folder and `.env.local` together into the new project, then restart. The encryption key in `.env.local` must stay paired with the encrypted vault. Alternatively, apply the changed `components/Dashboard.tsx`, `app/globals.css`, and `lib/db.ts` files to the original project after backing it up.

The original Downloads project was used as the source because the prior ChatGPT `/mnt/data` path is not present on this computer. Its source and private data were not modified.
