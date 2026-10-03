export interface ModelOption {
  id: string;
  label: string;
}

// Text-generation choices reviewed on 2026-10-03. See MODEL_SELECTION.md.
// This is a convenience catalog, not a claim about an account's access or quota.
const catalog: Record<string, readonly (readonly [string, string])[]> = {
  openai: [
    ["gpt-6.1-sol", "GPT-6.1 Sol"],
    ["gpt-6-astra", "GPT-6 Astra"],
    ["gpt-6-sol", "GPT-6 Sol"],
    ["gpt-6-luna", "GPT-6 Luna"],
    ["gpt-5.6-sol", "GPT-5.6 Sol"],
    ["gpt-5.6-terra", "GPT-5.6 Terra"],
    ["gpt-5.6-luna", "GPT-5.6 Luna"],
    ["gpt-5.5", "GPT-5.5"],
    ["gpt-5.4", "GPT-5.4"],
  ],
  anthropic: [
    ["claude-sonnet-5-5", "Claude Sonnet 5.5"],
    ["claude-opus-5-5", "Claude Opus 5.5"],
    ["claude-fable-5-1", "Claude Fable 5.1"],
    ["claude-haiku-4-5-20251001", "Claude Haiku 4.5 (2025-10-01)"],
  ],
  gemini: [
    ["gemini-3.8-flash", "Gemini 3.8 Flash"],
    ["gemini-3.7-flash", "Gemini 3.7 Flash"],
    ["gemini-3.6-flash", "Gemini 3.6 Flash"],
    ["gemini-3.5-flash", "Gemini 3.5 Flash"],
    ["gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"],
    ["gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite"],
    ["gemini-3.1-pro-preview", "Gemini 3.1 Pro (preview)"],
    ["gemini-3-flash-preview", "Gemini 3 Flash (preview)"],
    ["gemini-2.5-pro", "Gemini 2.5 Pro (existing accounts)"],
    ["gemini-2.5-flash", "Gemini 2.5 Flash (existing accounts)"],
    ["gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite (existing accounts)"],
  ],
  openrouter: [
    ["openai/gpt-6.1-sol", "OpenAI GPT-6.1 Sol"],
    ["openai/gpt-6-astra", "OpenAI GPT-6 Astra"],
    ["openai/gpt-6-sol", "OpenAI GPT-6 Sol"],
    ["openai/gpt-6-luna", "OpenAI GPT-6 Luna"],
    ["openai/gpt-5.6-sol", "OpenAI GPT-5.6 Sol"],
    ["openai/gpt-5.6-terra", "OpenAI GPT-5.6 Terra"],
    ["openai/gpt-5.6-luna", "OpenAI GPT-5.6 Luna"],
    ["anthropic/claude-sonnet-5.5", "Claude Sonnet 5.5"],
    ["anthropic/claude-opus-5.5", "Claude Opus 5.5"],
    ["google/gemini-3.8-flash", "Gemini 3.8 Flash"],
    ["deepseek/deepseek-v4.1-flash", "DeepSeek V4.1 Flash"],
  ],
  groq: [
    ["openai/gpt-oss-20b", "OpenAI GPT-OSS 20B"],
    ["openai/gpt-oss-120b", "OpenAI GPT-OSS 120B"],
    ["llama-3.1-8b-instant", "Llama 3.1 8B Instant"],
    ["llama-3.3-70b-versatile", "Llama 3.3 70B Versatile"],
    ["qwen/qwen3.8-27b", "Qwen 3.8 27B (preview)"],
  ],
  together: [
    ["openai/gpt-oss-120b", "OpenAI GPT-OSS 120B"],
    ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Instruct Turbo"],
    ["Qwen/Qwen3.8-2.4T-A95B", "Qwen 3.8 2.4T A95B"],
    ["Qwen/Qwen3.7-Max", "Qwen 3.7 Max"],
    ["Qwen/Qwen3.6-Plus", "Qwen 3.6 Plus"],
    ["Qwen/Qwen3.5-9B", "Qwen 3.5 9B"],
    ["MiniMaxAI/MiniMax-M3", "MiniMax M3"],
    ["moonshotai/Kimi-K3", "Kimi K3"],
    ["zai-org/GLM-5.3", "GLM 5.3"],
    ["zai-org/GLM-5.3-Flash", "GLM 5.3 Flash"],
    ["deepseek-ai/DeepSeek-V4-Pro-0813", "DeepSeek V4 Pro (08-13)"],
  ],
  mistral: [
    ["mistral-small-latest", "Mistral Small (latest alias)"],
    ["mistral-small-2603", "Mistral Small 4 (26.03)"],
    ["mistral-large-2512", "Mistral Large 3 (25.12)"],
    ["ministral-3b-2512", "Ministral 3B (25.12)"],
    ["ministral-8b-2512", "Ministral 8B (25.12)"],
    ["ministral-14b-2512", "Ministral 14B (25.12)"],
  ],
  xai: [["grok-4.7", "Grok 4.7"]],
  deepseek: [
    ["deepseek-flash", "DeepSeek V4.1 Flash"],
    ["deepseek-v4-pro", "DeepSeek V4 Pro"],
  ],
};

export function getModelOptions(presetId: string, defaultModel = ""): ModelOption[] {
  const options = (catalog[presetId] ?? []).map(([id, label]) => ({ id, label }));
  // Preserve a preset's default even when the catalog is updated independently.
  if (defaultModel && !options.some(option => option.id === defaultModel)) {
    options.unshift({ id: defaultModel, label: defaultModel });
  }
  return options;
}
