# AI providers in Atlas Cloud

Sign in and open **Providers & settings**. Choose a hosted provider, enter a model available in your account, paste its API key, save, and test the connection. Keys are encrypted server-side and belong to your Atlas account only.

Native Gemini, Anthropic, and OpenAI paths support their provider's web-search tools. Search still depends on the chosen model, permissions, service availability, and billing. Compatible providers support research synthesis but do not automatically gain native web search; Atlas records that limitation and does not accept invented URLs as verified evidence.

OpenRouter, Groq, Together, Mistral, xAI, DeepSeek, and administrator-approved custom HTTPS services can use the OpenAI-compatible adapter. A key alone cannot identify every proprietary API protocol. Confirm the model ID in the provider's own console; preset model suggestions are editable.

Automatic routing tries enabled providers, favoring the active provider and a reusable checkpoint's provider. An explicit provider selection does not silently switch vendors. Failed attempts remain visible in provider telemetry and the limitation ledger.

Local endpoints such as Ollama and LM Studio are supported by the original local edition. Cloud-hosted Atlas cannot access a user's localhost. To use a custom hosted endpoint, ask the operator to approve its HTTPS origin in `ATLAS_ALLOWED_PROVIDER_ORIGINS`. Credentials remain scoped to that account.

AI usage may be billed by the provider. Adding a key does not make inference free. No real AI key is used by the automated test suite.
