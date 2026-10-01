import { validateProviderUrl } from "./providerSecurity";
import { db, getSetting, now, randomUUID, setSetting } from "./db";
import { decryptSecret, encryptSecret } from "./cryptoVault";
import { PROVIDER_PRESETS, presetById, presetCapabilities } from "./providerCatalog";
import type { ProviderCallResult, ProviderConfig, ProviderKind, ProviderPublic, SourceRef } from "./types";
export function listProviderPresets() {
    return PROVIDER_PRESETS.filter(p => !["ollama", "lmstudio"].includes(p.id));
}
export async function listProvidersPublic(): Promise<ProviderPublic[]> {
    const activeId = (await getSetting("active_provider_id", "auto"));
    const vault = ((await db.prepare(`SELECT * FROM providers ORDER BY created_at`).all()) as any[]).map((row) => {
        const preset = presetById(row.preset_id) ?? presetById("custom")!;
        return {
            id: row.id,
            name: row.name,
            kind: row.kind as ProviderKind,
            model: row.model,
            baseUrl: row.base_url,
            webSearchEnabled: Boolean(row.web_search_enabled),
            enabled: Boolean(row.enabled),
            isActive: activeId === row.id,
            capabilities: { ...presetCapabilities(preset), webSearch: row.kind === "gemini" || row.kind === "anthropic" || row.kind === "openai" },
            source: "vault" as const,
            hasKey: Boolean(row.encrypted_api_key) || Boolean(preset.keyOptional),
            status: row.status,
            lastError: row.last_error,
            lastTestedAt: row.last_tested_at,
        };
    });
    return vault;
}
export async function getProviderConfig(id: string): Promise<ProviderConfig | null> {
    const row = (await db.prepare(`SELECT * FROM providers WHERE id = ?`).get(id)) as any;
    if (!row)
        return null;
    const preset = presetById(row.preset_id) ?? presetById("custom")!;
    let apiKey = "";
    if (row.encrypted_api_key)
        apiKey = decryptSecret(row.encrypted_api_key);
    return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        model: row.model,
        baseUrl: row.base_url,
        apiKey,
        webSearchEnabled: Boolean(row.web_search_enabled),
        enabled: Boolean(row.enabled),
        isActive: (await getSetting("active_provider_id")) === row.id,
        capabilities: { ...presetCapabilities(preset), webSearch: row.kind === "gemini" || row.kind === "anthropic" || row.kind === "openai" },
        source: "vault",
    };
}
export async function getProviderCandidates(requestedId?: string): Promise<ProviderConfig[]> {
    const publicProviders = (await listProvidersPublic()).filter((x) => x.enabled);
    if (requestedId && requestedId !== "auto") {
        const selected = (await getProviderConfig(requestedId));
        return selected && selected.enabled ? [selected] : [];
    }
    const activeId = (await getSetting("active_provider_id", "auto"));
    const ordered = [...publicProviders].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId));
    return (await Promise.all(ordered.map(async (x) => (await getProviderConfig(x.id))))).filter(Boolean) as ProviderConfig[];
}
export async function saveProvider(input: {
    id?: string;
    presetId: string;
    name?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    webSearchEnabled?: boolean;
    enabled?: boolean;
}) {
    const preset = presetById(input.presetId) ?? presetById("custom")!;
    const existing = input.id ? (await db.prepare(`SELECT * FROM providers WHERE id = ?`).get(input.id)) as any : null;
    const id = existing?.id ?? randomUUID();
    const model = String(input.model ?? existing?.model ?? preset.defaultModel).trim();
    const baseUrl = normalizeBaseUrl(String(input.baseUrl ?? existing?.base_url ?? preset.baseUrl).trim());
    const name = String(input.name ?? existing?.name ?? preset.label).trim() || preset.label;
    if (!model)
        throw new Error("A model ID is required for this provider.");
    if (!baseUrl)
        throw new Error("A base URL is required for this provider.");
    const suppliedKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    const encrypted = suppliedKey ? encryptSecret(suppliedKey) : (existing?.encrypted_api_key ?? "");
    if (!encrypted && !preset.keyOptional)
        throw new Error("An API key is required for this provider.");
    validateProviderUrl(baseUrl);
    if(name.length>160 || model.length>200 || baseUrl.length>2048 || suppliedKey.length>8192) throw new Error("Provider details are too long.");
    const count=await db.prepare(`SELECT count(*) AS n FROM providers`).get();
    if(!existing && Number(count.n)>=20)throw new Error("This account supports up to 20 configured providers.");
    const created = existing?.created_at ?? now();
    (await db.prepare(`INSERT INTO providers (id, name, preset_id, kind, model, base_url, encrypted_api_key, web_search_enabled, enabled, status, last_error, last_tested_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,preset_id=excluded.preset_id,kind=excluded.kind,model=excluded.model,base_url=excluded.base_url,encrypted_api_key=excluded.encrypted_api_key,web_search_enabled=excluded.web_search_enabled,enabled=excluded.enabled,updated_at=excluded.updated_at`)
        .run(id, name, preset.id, preset.kind, model, baseUrl, encrypted, input.webSearchEnabled === false ? 0 : 1, input.enabled === false ? 0 : 1, existing?.status ?? "untested", existing?.last_error ?? null, existing?.last_tested_at ?? null, created, now()));
    if (!(await getSetting("active_provider_id")))
        (await setSetting("active_provider_id", id));
    return id;
}
export async function deleteProvider(id: string) {
    (await db.prepare(`DELETE FROM providers WHERE id = ?`).run(id));
    if ((await getSetting("active_provider_id")) === id)
        (await setSetting("active_provider_id", "auto"));
}
export async function setActiveProvider(id: string) {
    if (id !== "auto" && !(await getProviderConfig(id)))
        throw new Error("Provider not found.");
    (await setSetting("active_provider_id", id));
}
export async function getActiveProviderId() {
    return (await getSetting("active_provider_id", "auto"));
}
export async function updateProviderHealth(id: string, ok: boolean, error?: string) {
    if (id.startsWith("env:"))
        return;
    (await db.prepare(`UPDATE providers SET status = ?, last_error = ?, last_tested_at = ?, updated_at = ? WHERE id = ?`)
        .run(ok ? "ready" : "error", ok ? null : (error ?? "Unknown provider error"), now(), now(), id));
}
export async function testProvider(config: ProviderConfig): Promise<{
    ok: true;
    model: string;
    latencyMs: number;
    text: string;
}> {
    const started = Date.now();
    const result = await callProvider(config, {
        prompt: "Return exactly ATLAS_OK and nothing else.",
        system: "You are a connection test. Follow the instruction exactly.",
        useWebSearch: false,
    });
    const text = result.text.trim();
    if (!text)
        throw new Error("Provider returned an empty response.");
    return { ok: true, model: result.model, latencyMs: Date.now() - started, text: text.slice(0, 120) };
}
export async function callProvider(config: ProviderConfig, input: {
    prompt: string;
    system?: string;
    useWebSearch?: boolean;
}): Promise<ProviderCallResult> {
    validateProviderUrl(config.baseUrl);
    if (!config.apiKey && !config.capabilities.apiKeyOptional)
        throw new Error(`${config.name} has no API key configured.`);
    if (config.kind === "gemini")
        return (await callGemini(config, input));
    if (config.kind === "anthropic")
        return (await callAnthropic(config, input));
    if (config.kind === "openai")
        return (await callOpenAI(config, input));
    return (await callOpenAICompatible(config, input));
}
async function callGemini(config: ProviderConfig, input: {
    prompt: string;
    system?: string;
    useWebSearch?: boolean;
}): Promise<ProviderCallResult> {
    const url = `${config.baseUrl.replace(/\/$/, "")}/${encodeURIComponent(config.model)}:generateContent`;
    const text = [input.system, input.prompt].filter(Boolean).join("\n\n");
    const body: any = { contents: [{ role: "user", parts: [{ text }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 8192 } };
    const useSearch = Boolean(input.useWebSearch && config.webSearchEnabled);
    if (useSearch)
        body.tools = [{ google_search: {} }];
    const raw = await fetchJson(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey || "" },
        body: JSON.stringify(body),
    });
    const out = (raw?.candidates?.[0]?.content?.parts ?? []).filter((p: any) => typeof p?.text === "string").map((p: any) => p.text).join("\n").trim();
    if (!out)
        throw new Error(`Gemini returned no text (${raw?.candidates?.[0]?.finishReason || raw?.promptFeedback?.blockReason || "unknown reason"}).`);
    const sources = new Map<string, SourceRef>();
    for (const candidate of raw?.candidates ?? []) {
        for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
            if (chunk?.web?.uri)
                addSource(sources, chunk.web.uri, chunk.web.title);
        }
    }
    return { text: out, model: config.model, sources: [...sources.values()], raw, usage: { inputTokens: raw?.usageMetadata?.promptTokenCount, outputTokens: raw?.usageMetadata?.candidatesTokenCount }, webSearchUsed: useSearch && sources.size > 0 };
}
async function callAnthropic(config: ProviderConfig, input: {
    prompt: string;
    system?: string;
    useWebSearch?: boolean;
}): Promise<ProviderCallResult> {
    const useSearch = Boolean(input.useWebSearch && config.webSearchEnabled);
    const body: any = {
        model: config.model,
        max_tokens: 8192,
        messages: [{ role: "user", content: input.prompt }],
    };
    if (input.system)
        body.system = input.system;
    if (useSearch)
        body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: Number(process.env.ATLAS_WEB_SEARCH_MAX_USES || 8) }];
    const raw = await fetchJson(`${config.baseUrl.replace(/\/$/, "")}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": config.apiKey || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
    });
    const out = (raw?.content ?? []).filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("\n").trim();
    if (!out)
        throw new Error(`Claude returned no text (${raw?.stop_reason || "unknown reason"}).`);
    const sources = collectHttpSources(raw);
    return { text: out, model: raw?.model || config.model, sources, raw, usage: { inputTokens: raw?.usage?.input_tokens, outputTokens: raw?.usage?.output_tokens }, webSearchUsed: useSearch && sources.length > 0 };
}
async function callOpenAI(config: ProviderConfig, input: {
    prompt: string;
    system?: string;
    useWebSearch?: boolean;
}): Promise<ProviderCallResult> {
    const useSearch = Boolean(input.useWebSearch && config.webSearchEnabled);
    const body: any = { model: config.model, input: [input.system, input.prompt].filter(Boolean).join("\n\n") };
    if (useSearch) {
        body.tools = [{ type: "web_search" }];
        body.tool_choice = "auto";
        body.include = ["web_search_call.action.sources"];
    }
    const raw = await fetchJson(`${config.baseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${config.apiKey || ""}` },
        body: JSON.stringify(body),
    });
    const out = extractOpenAIResponseText(raw);
    if (!out)
        throw new Error("OpenAI returned no text.");
    const sources = collectHttpSources(raw);
    return { text: out, model: raw?.model || config.model, sources, raw, usage: { inputTokens: raw?.usage?.input_tokens, outputTokens: raw?.usage?.output_tokens }, webSearchUsed: useSearch && sources.length > 0 };
}
async function callOpenAICompatible(config: ProviderConfig, input: {
    prompt: string;
    system?: string;
}): Promise<ProviderCallResult> {
    const messages = [] as Array<{
        role: string;
        content: string;
    }>;
    if (input.system)
        messages.push({ role: "system", content: input.system });
    messages.push({ role: "user", content: input.prompt });
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (config.apiKey)
        headers.authorization = `Bearer ${config.apiKey}`;
    const raw = await fetchJson(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: config.model, messages, stream: false }),
    });
    const content = raw?.choices?.[0]?.message?.content;
    const out = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map((p: any) => p?.text || "").join("\n").trim() : "";
    if (!out)
        throw new Error("The OpenAI-compatible endpoint returned no text. Check the model ID and endpoint compatibility.");
    return { text: out, model: raw?.model || config.model, sources: [], raw, usage: { inputTokens: raw?.usage?.prompt_tokens, outputTokens: raw?.usage?.completion_tokens }, webSearchUsed: false };
}
function extractOpenAIResponseText(raw: any) {
    if (typeof raw?.output_text === "string")
        return raw.output_text.trim();
    const chunks: string[] = [];
    for (const item of raw?.output ?? []) {
        for (const part of item?.content ?? []) {
            if ((part?.type === "output_text" || part?.type === "text") && typeof part?.text === "string")
                chunks.push(part.text);
        }
    }
    return chunks.join("\n").trim();
}
function collectHttpSources(value: unknown): SourceRef[] {
    const found = new Map<string, SourceRef>();
    const seen = new Set<unknown>();
    function walk(node: any) {
        if (!node || typeof node !== "object" || seen.has(node))
            return;
        seen.add(node);
        if (typeof node.url === "string" && /^https?:\/\//i.test(node.url)) {
            addSource(found, node.url, typeof node.title === "string" ? node.title : undefined);
        }
        if (typeof node.uri === "string" && /^https?:\/\//i.test(node.uri)) {
            addSource(found, node.uri, typeof node.title === "string" ? node.title : undefined);
        }
        if (Array.isArray(node))
            node.forEach(walk);
        else
            Object.values(node).forEach(walk);
    }
    walk(value);
    return [...found.values()].slice(0, 100);
}
function addSource(map: Map<string, SourceRef>, url: string, title?: string) {
    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.replace(/^www\./, "");
        map.set(url, { url, title: title?.trim() || domain || url, domain });
    }
    catch { /* ignore malformed source URLs */ }
}
async function fetchJson(url: string, init: RequestInit) {
    let response: Response;
    try {
        response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(Math.min(90000,Math.max(1000,Number(process.env.ATLAS_PROVIDER_TIMEOUT_MS || 90000)))) });
    }
    catch (error) {
        throw new Error(`Could not reach provider endpoint: ${error instanceof Error ? error.message : "network error"}`);
    }
    const text = await response.text();
    let raw: any;
    try {
        raw = text ? JSON.parse(text) : {};
    }
    catch {
        raw = { rawText: text };
    }
    if(text.length>2_000_000) throw new Error("The provider response exceeded the supported size. Narrow your research scope.");
    if (!response.ok) {
        let message = raw?.error?.message || raw?.message || raw?.detail || String(raw?.rawText || "").slice(0, 500) || `HTTP ${response.status}`;
        message=String(message).slice(0,500);
        const headers=new Headers(init.headers);
        for(const key of [headers.get('x-goog-api-key'),headers.get('x-api-key'),headers.get('authorization')?.replace(/^Bearer /i,'')])if(key)message=message.replaceAll(key,'[redacted]');
        throw new Error(`${response.status} ${response.statusText}: ${message}`);
    }
    return raw;
}
function normalizeBaseUrl(value: string) {
    const clean = value.replace(/\/$/, "");
    if (!clean)
        return "";
    let parsed: URL;
    try {
        parsed = new URL(clean);
    }
    catch {
        throw new Error("Base URL must be a valid http:// or https:// URL.");
    }
    if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("Base URL must use http:// or https://.");
    return clean;
}
