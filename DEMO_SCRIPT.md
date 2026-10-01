# 2-Minute Managing Director Demo

## Opening — 15 seconds

> “The main idea is that this is not tied to one AI. Claude, Gemini, OpenAI, Groq, a local model—those are replaceable engines. Atlas owns the research memory, source provenance, folders, decisions, audit trail, and exact resume state.”

Open **Overview**. Point out the provider count, findings, verified resources, approval queue, and the latest resumable sessions.

## Provider fabric — 30 seconds

Open **System & Providers**.

> “A team member can bring their own API key. Keys are encrypted before storage and are never returned to the browser. We have native adapters for Gemini, Claude, and OpenAI, plus an OpenAI-compatible bridge covering OpenRouter, Groq, Together, Mistral, xAI, DeepSeek, Ollama, LM Studio, and custom endpoints.”

Show:

- provider cards
- **Test** button
- **Use as primary**
- **Auto Router**

Then say:

> “If the primary provider is down or rate-limited, Auto Router can fail over. The failure is still logged, so resilience does not reduce traceability.”

## Live research — 35 seconds

Open **Research**.

Use a concrete company-relevant topic and select **Auto Router**.

> “The workflow has two AI stages. First it collects evidence. Then it synthesizes atomic findings, folder paths, confidence scores, tags, next tasks, and limitations.”

Run the research.

When it completes, return to Overview.

> “The security boundary is important: a model cannot simply invent a URL and get it saved as a source. Atlas only permits source URLs that actually appeared in the provider's search metadata.”

## Human approval — 15 seconds

Open a pending item.

> “Above the confidence threshold, Atlas files automatically. Below the threshold, it asks us. When I approve this folder, that human decision is remembered for future research.”

Approve it.

## Search, audit, resume — 20 seconds

Open **Global Search** and search for a concept from the run.

> “Everything is indexed across content, tags, sources, and folder paths.”

Open **Activity History**.

> “We keep both a human/system audit ledger and provider telemetry—model, stage, latency, token usage when available, and failures.”

Click **Resume from checkpoint** on a session.

> “Research continues from stored state instead of starting from zero, and duplicate findings are suppressed.”

## Optional “show the engineering” reveal — 10 seconds

Open `data/workspaces/<project-id>/` in Finder.

> “The folder tree is not only visual. Atlas mirrors organized findings and verified resources into real Markdown folders on disk, while SQLite remains the searchable source of truth.”

Show `_Needs Approval`, a normal research folder, `Sources/Web`, and `_Research-History` after a live run.

## Close — 5 seconds

> “So the model can change. The organization's research memory, governance, and traceability stay intact.”
