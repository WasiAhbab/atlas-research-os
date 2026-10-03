# Model selection

In Providers & settings, choose a provider, then choose a versioned model from
the Model dropdown. The exact API identifier appears below the selection.
Save the connection and use Test before running research. Account permissions,
quota, model retirement, and provider tool support still apply.

Custom model… preserves manual model entry for newer releases, private models,
and compatible gateways. Hosted providers without an old default start at
Choose a model; choosing a provider never silently selects a paid model for them.
Custom gateways require the model ID supported by that endpoint. A saved
connection keeps its original model; this UI change does not migrate data or
change active providers, research routing, encryption, or API request formats.

The bundled catalog is a curated list of text-generation models, not a live
account-specific inventory or every historical model. It does not make paid
discovery requests or send API keys to another service. Add documented IDs to
`lib/modelCatalog.ts` as providers release new versions. Keep retired, media-only,
embedding, and provider-specific batch IDs out of the research picker. Pro modes
that require extra request parameters are not separate native OpenAI model IDs.

## Sources reviewed 2026-10-03

- OpenAI: https://developers.openai.com/api/docs/models
- OpenAI 6 / 5.6 families: https://developers.openai.com/api/docs/guides/latest-model
- Claude: https://platform.claude.com/docs/en/models/overview
- Gemini: https://ai.google.dev/gemini-api/docs/models
- OpenRouter public catalog: https://openrouter.ai/api/v1/models
- Groq: https://console.groq.com/docs/models
- Together: https://docs.together.ai/docs/serverless/models
- Mistral: https://docs.mistral.ai/models/mistral-small-4-0-26-03
- Mistral releases: https://docs.mistral.ai/resources/changelogs
- xAI: https://docs.x.ai/developers/models
- DeepSeek: https://api-docs.deepseek.com/updates/

API IDs are provider-specific. For example, native Claude uses
`claude-sonnet-5-5`, while OpenRouter uses `anthropic/claude-sonnet-5.5`.
Catalog presence does not mean that a model has been live-tested with a paid key.

## Verification

- TypeScript, the production build, and the 18 existing cloud integration checks passed.
- Browser-tested the actual ProviderVault form in an isolated local fixture with
  synthetic credentials and intercepted save requests. Verified provider-specific
  options for all hosted presets, provider switching, blank-model save prevention,
  exact OpenAI and OpenRouter IDs in submitted payloads, and custom-ID saving.
- Visually checked the selector with the existing workspace styles. No real AI
  requests were made and no saved account/provider data was changed during testing.
