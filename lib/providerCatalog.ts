import type { ProviderCapabilities, ProviderKind } from "./types";
export interface ProviderPreset {
    id: string;
    label: string;
    kind: ProviderKind;
    baseUrl: string;
    defaultModel: string;
    description: string;
    keyOptional?: boolean;
    nativeWebSearch: boolean;
}
export const PROVIDER_PRESETS: ProviderPreset[] = [
    { id: "gemini", label: "Google Gemini", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/models", defaultModel: "gemini-3.8-flash", description: "Native Gemini API with Google Search grounding.", nativeWebSearch: true },
    { id: "anthropic", label: "Anthropic Claude", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-5-5", description: "Claude Messages API with Anthropic web search.", nativeWebSearch: true },
    { id: "openai", label: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-5.6-luna", description: "OpenAI Responses API with native web search.", nativeWebSearch: true },
    { id: "openrouter", label: "OpenRouter", kind: "openai_compatible", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "", description: "Use models from many vendors through an OpenAI-compatible endpoint.", nativeWebSearch: false },
    { id: "groq", label: "Groq", kind: "openai_compatible", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "openai/gpt-oss-20b", description: "Fast OpenAI-compatible inference.", nativeWebSearch: false },
    { id: "together", label: "Together AI", kind: "openai_compatible", baseUrl: "https://api.together.xyz/v1", defaultModel: "", description: "OpenAI-compatible hosted open models.", nativeWebSearch: false },
    { id: "mistral", label: "Mistral AI", kind: "openai_compatible", baseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-small-latest", description: "Mistral through its OpenAI-compatible interface.", nativeWebSearch: false },
    { id: "xai", label: "xAI Grok", kind: "openai_compatible", baseUrl: "https://api.x.ai/v1", defaultModel: "grok-4.7", description: "xAI through its OpenAI-compatible REST API.", nativeWebSearch: false },
    { id: "deepseek", label: "DeepSeek", kind: "openai_compatible", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-flash", description: "DeepSeek OpenAI-compatible API.", nativeWebSearch: false },
    { id: "ollama", label: "Ollama / local", kind: "openai_compatible", baseUrl: "http://localhost:11434/v1", defaultModel: "llama3.2", description: "Local OpenAI-compatible endpoint; API key can be blank.", keyOptional: true, nativeWebSearch: false },
    { id: "lmstudio", label: "LM Studio / local", kind: "openai_compatible", baseUrl: "http://localhost:1234/v1", defaultModel: "", description: "Local OpenAI-compatible endpoint; API key can be blank.", keyOptional: true, nativeWebSearch: false },
    { id: "custom", label: "Custom OpenAI-compatible", kind: "openai_compatible", baseUrl: "", defaultModel: "", description: "Any service exposing /chat/completions in the OpenAI format.", keyOptional: true, nativeWebSearch: false }
];
export function presetCapabilities(preset: ProviderPreset): ProviderCapabilities {
    return {
        webSearch: preset.nativeWebSearch,
        structuredOutput: preset.kind === "gemini",
        customBaseUrl: preset.kind === "openai_compatible",
        apiKeyOptional: Boolean(preset.keyOptional)
    };
}
export function presetById(id: string) {
    return PROVIDER_PRESETS.find((x) => x.id === id);
}
