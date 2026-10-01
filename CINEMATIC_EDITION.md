# Atlas — cinematic edition

The new homepage is at `/`. The full working research application is at `/workspace`.

## Design direction

Inspired by the visual pacing of https://www.icomat.co.uk/: a full-viewport media opening, oversized editorial typography, expansive light sections, numbered storytelling, and a pinned scroll sequence. Atlas uses original copy, its own visual identity, and two original AI-generated assets. This is an Atlas adaptation, not a pixel-identical copy of Icomat's site, proprietary animation code, or video.

The earlier Axess Lab website source was not available in this project. The hybrid direction develops the existing Atlas aesthetic into graphite, soft mineral white, mint accents, and subtle lavender reflections.

## What's new

- Cinematic hero with an original intelligence sculpture, scroll-linked parallax, a subtle moving light layer, and a restrained headline entrance.
- Four-stage pinned desktop story: evidence, synthesis, human review, and persistent memory. Both scroll and buttons can select a stage.
- Mobile uses a compact, button-controlled sequence with no long pinned scroll region.
- Pause-motion control and OS reduced-motion support disable animation and remove the long pinned section.
- Staggered section reveals, understated hover movement, a mobile dialog menu with keyboard focus containment, and a direct workspace skip link.
- A functional homepage question input carries the question to the research composer without automatically submitting a provider request.
- Provider and feature links open the corresponding workspace tab directly.
- Updated workspace palette and generated hero visual. Existing research, providers, folders, approvals, search, history, limitations, and resume flows remain available.
- Images are local WebP assets: approximately 175 KB and 150 KB. No remote font dependency, video download, or third-party animation library.

The moving visuals are generated still images animated in the browser, not generated video footage.

## Run

```sh
npm install
npm run setup
npm run doctor
npm run dev
```

Open http://localhost:3000. Bookmark http://localhost:3000/workspace for direct access to the application.

For production verification:

```sh
npm run typecheck
npm run build
npm run start
```

Use Node 22.13 or newer. Verification used Node 24.19.

## Preserve your existing data

Stop the old app and back it up before migrating. Copy its `data/` directory and `.env.local` together into the updated project. The encryption key must remain paired with its vault. The archive contains neither private credentials nor research data. It opens with the original labeled demo workspace when started with no database.

## Verification

- TypeScript check, production build, and runtime doctor: passed.
- Desktop layout at 1440 × 1000 and mobile at 390 × 844; no horizontal page overflow in the inspected views.
- Scroll-driven stage change and direct stage selection: passed.
- Mobile menu, anchor navigation, and mobile stage selection: passed.
- Homepage question passed intact into the research composer: passed.
- Demo research completed through the new entry flow and produced findings, approval items, limitations, and a saved session.
- Motion pause and direct provider navigation checked in the browser.
- Existing demo workflow checks from the previous edition are documented in UI_UX_NOTES.md.
- Live vendor API calls were not tested or charged. Use the provider Test button with your own credentials before a live demo.

## Generated assets

Created with the built-in image-generation tool, then encoded as WebP for use in the project:

- `public/visuals/intelligence-core.webp`
- `public/visuals/knowledge-layers.webp`

Prompts are retained in `VISUAL_PROMPTS.md` for future art direction.
