export type Severity = "info" | "warning" | "error";
export type FindingStatus = "filed" | "needs_approval" | "unfiled";
export type ProviderKind = "gemini" | "anthropic" | "openai" | "openai_compatible";
export interface SourceRef {
    title: string;
    url: string;
    domain?: string;
}
export interface ResearchFindingDraft {
    title: string;
    summary: string;
    content: string;
    recommendedFolderPath: string;
    confidence: number;
    tags: string[];
    sourceUrls: string[];
    rationale: string;
}
export interface ResearchPayload {
    executiveSummary: string;
    findings: ResearchFindingDraft[];
    resourcePlacements?: Array<{
        url: string;
        recommendedFolderPath: string;
        confidence: number;
        rationale: string;
    }>;
    suggestedFolders: string[];
    nextTasks: string[];
    limitations: Array<{
        code: string;
        title: string;
        detail: string;
    }>;
}
export interface ProviderCapabilities {
    webSearch: boolean;
    structuredOutput: boolean;
    customBaseUrl: boolean;
    apiKeyOptional?: boolean;
}
export interface ProviderConfig {
    id: string;
    name: string;
    kind: ProviderKind;
    model: string;
    baseUrl: string;
    apiKey?: string;
    webSearchEnabled: boolean;
    enabled: boolean;
    isActive: boolean;
    capabilities: ProviderCapabilities;
    source: "vault" | "environment";
}
export interface ProviderPublic {
    id: string;
    name: string;
    kind: ProviderKind;
    model: string;
    baseUrl: string;
    webSearchEnabled: boolean;
    enabled: boolean;
    isActive: boolean;
    capabilities: ProviderCapabilities;
    source: "vault" | "environment";
    hasKey: boolean;
    status?: string;
    lastError?: string | null;
    lastTestedAt?: string | null;
}
export interface ProviderCallResult {
    text: string;
    model: string;
    sources: SourceRef[];
    raw?: unknown;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
    };
    webSearchUsed: boolean;
}
export interface ResearchRunResult {
    payload: ResearchPayload;
    sources: SourceRef[];
    provider: string;
    providerId?: string;
    model: string;
    rawState?: unknown;
}
