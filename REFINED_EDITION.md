# Atlas — refined workspace edition

## Experience

- Internal navigation now uses an approximately 0.8-second reveal: translucent planes unfold around the Atlas mark, with a destination label and parting glass shutters. Header links, workspace navigation, command navigation, and the homepage research form share this treatment.
- Ordinary editing, searching, filtering, and saving remain immediate. Repeated clicks during a transition are guarded. External links and modified clicks retain their normal behavior.
- OS reduced-motion preferences and the homepage Pause motion control bypass the reveal. Anchor destinations receive keyboard focus, and mobile navigation closes after selection.
- The research desk uses editorial typography, warm graphite and sage, generous whitespace, a single prominent research entry, inline metrics, a research journal, and a human review note.
- Research writing, the knowledge library, search, providers, approvals, and saved checkpoints share quieter borders, clearer hierarchy, and restrained interaction feedback.
- Suggested research prompts populate the composer. The homepage question also carries into the composer without starting a paid request.
- Fixed a command-palette Enter-key issue that could reopen the palette after navigation.

## Verification — October 1, 2026

Passed TypeScript checking, production compilation, and the runtime doctor.

Browser verification used an isolated demo database, without copying personal credentials or research data:

- All four header destinations, including anchor scrolling and workspace routing.
- Reveal visibility and completion (approximately 0.9 seconds including browser-tool overhead).
- Desktop 1440 × 1000 and mobile 390 × 844; no horizontal page overflow in inspected views.
- Mobile menu closure and motion-pause bypass.
- Homepage question handoff and suggested-prompt prefill.
- Demo research completion, approval with an edited folder, library filtering and finding details, memory search, history, and checkpoint resume.
- Command-palette keyboard navigation and provider preset switching.
- No browser console errors were recorded during the final checks.

Live provider API calls were not exercised. Use your own key and the provider health check to verify a live connection. Local preview runs at http://127.0.0.1:3210; the normal project scripts still default to port 3000.

## Package

The archive includes source, documentation, and local artwork. Dependencies, build output, research databases, and private environment files are excluded. See CINEMATIC_EDITION.md for setup and existing-data migration instructions.
