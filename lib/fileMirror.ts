import { db } from "./db";
function safeSegment(value: string) {
    const cleaned = String(value || "untitled")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 _.-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 90);
    return cleaned || "untitled";
}
export async function mirrorFinding(input: {
    projectId: string;
    id: string;
    title: string;
    summary: string;
    content: string;
    folderPath?: string | null;
    confidence: number;
    status: string;
    tags: string[];
    sourceUrls: string[];
    rationale?: string;
    createdAt: string;
}) {
    const destination = input.folderPath || "_Needs Approval";
    const filename = `${safeSegment(input.title)}--${safeSegment(input.id).slice(0, 12)}.md`;
    const body = [
        "---",
        `atlas_id: ${JSON.stringify(input.id)}`,
        `status: ${JSON.stringify(input.status)}`,
        `confidence: ${input.confidence.toFixed(4)}`,
        `folder: ${JSON.stringify(input.folderPath || "_Needs Approval")}`,
        `created_at: ${JSON.stringify(input.createdAt)}`,
        `tags: ${JSON.stringify(input.tags)}`,
        `sources: ${JSON.stringify(input.sourceUrls)}`,
        "---",
        "",
        `# ${input.title}`,
        "",
        input.summary,
        "",
        input.content,
        "",
        "## Organization rationale",
        "",
        input.rationale || "No rationale supplied.",
        "",
        "## Sources",
        "",
        ...(input.sourceUrls.length ? input.sourceUrls.map((url) => `- ${url}`) : ["- No verified source URL attached."]),
        "",
    ].join("\n");
    await saveDocument(input.projectId, input.id, `${input.folderPath || "_Needs Approval"}/${filename}`, body);
}
export async function mirrorResource(input: {
    projectId: string;
    id: string;
    title: string;
    url: string;
    description?: string;
    folderPath?: string | null;
    status?: string;
    rationale?: string;
    createdAt: string;
}) {
    const filename = `${safeSegment(input.title)}--${safeSegment(input.id).slice(0, 12)}.md`;
    const body = [
        "---",
        `atlas_id: ${JSON.stringify(input.id)}`,
        `url: ${JSON.stringify(input.url)}`,
        `folder: ${JSON.stringify(input.folderPath || "_Needs Approval")}`,
        `status: ${JSON.stringify(input.status || "filed")}`,
        `created_at: ${JSON.stringify(input.createdAt)}`,
        "---",
        "",
        `# ${input.title}`,
        "",
        input.description || "Research resource captured by Atlas.",
        input.rationale || "",
        "",
        input.url,
        "",
    ].join("\n");
    await saveDocument(input.projectId, input.id, `${input.folderPath || "_Needs Approval"}/${filename}`, body);
}
export async function mirrorSession(input: {
    projectId: string;
    sessionId: string;
    payload: unknown;
}) {
    await saveDocument(input.projectId, input.sessionId, `_Research-History/${input.sessionId}.json`, JSON.stringify(input.payload, null, 2));
}
async function saveDocument(projectId: string, id: string, path: string, body: string) {
    await db.prepare(`INSERT INTO documents(id,project_id,path,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET path=excluded.path,body=excluded.body`).run(id, projectId, path, body);
}
export function workspaceMirrorPath(projectId: string) { return `Private cloud documents / ${projectId}`; }
