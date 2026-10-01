import { randomUUID } from "node:crypto";
import { db, transaction } from "./postgres";
export { db, transaction };
export async function notify(input: {
    projectId?: string;
    sessionId?: string;
    sourceId?: string;
    title: string;
    detail: string;
    severity?: string;
    destination?: string;
}) {
    (await db.prepare(`INSERT OR IGNORE INTO notifications (id,project_id,session_id,source_id,title,detail,severity,destination,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(randomUUID(), input.projectId ?? null, input.sessionId ?? null, input.sourceId ?? null, input.title, input.detail, input.severity || "info", input.destination || "issues", now()));
}
export async function recoverInterruptedSessions() {
 const cutoff=new Date(Date.now()-10*60*1000).toISOString();
 await transaction(async()=>{
  const jobs=await db.prepare(`SELECT * FROM research_jobs WHERE status IN ('running','queued') AND updated_at<?`).all(cutoff);
  for(const j of jobs) {
   await db.prepare(`UPDATE research_jobs SET status='interrupted',generation=generation+1 WHERE id=?`).run(j.id);
   await db.prepare(`UPDATE sessions SET status='interrupted',error='The cloud worker stopped. Resume from the latest saved stage.',updated_at=? WHERE id=? AND status!='completed'`).run(now(),j.session_id);
   await db.prepare(`DELETE FROM session_leases WHERE session_id=?`).run(j.session_id);
   await recordLimitation({projectId:j.project_id,sessionId:j.session_id,code:'RESEARCH_INTERRUPTED',title:'Research needs to be resumed',detail:'The worker stopped responding. Your completed stages remain saved.'});
  }
 });
}
export function now() { return new Date().toISOString(); }
export async function getSetting(key: string, fallback = "") {
    const row = (await db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key)) as {
        value?: string;
    } | undefined;
    return row?.value ?? fallback;
}
export async function setSetting(key: string, value: string) {
    (await db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
        .run(key, value, now()));
}
export async function logActivity(input: {
    projectId?: string;
    sessionId?: string;
    action: string;
    detail: string;
    severity?: "info" | "warning" | "error";
}) {
    (await db.prepare(`INSERT INTO activity_logs (id, session_id, project_id, action, detail, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), input.sessionId ?? null, input.projectId ?? null, input.action, input.detail, input.severity ?? "info", now()));
    if (input.severity && input.severity !== "info" && input.action !== "limitation.recorded")
        (await notify({ ...input, title: input.action.replaceAll(".", " "), destination: "history" }));
}
export async function recordLimitation(input: {
    projectId?: string;
    sessionId?: string;
    code: string;
    title: string;
    detail: string;
}) {
    const id = randomUUID();
    (await db.prepare(`INSERT INTO limitations (id, session_id, project_id, code, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`)
        .run(id, input.sessionId ?? null, input.projectId ?? null, input.code, input.title, input.detail, now()));
    (await notify({ ...input, sourceId: id, severity: "warning", destination: "issues" }));
    (await logActivity({ projectId: input.projectId, sessionId: input.sessionId, action: "limitation.recorded", detail: `${input.title}: ${input.detail}`, severity: "warning" }));
}
export async function recordProviderCall(input: {
    projectId?: string;
    sessionId?: string;
    providerId?: string;
    providerName: string;
    stage: string;
    model: string;
    success: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
}) {
    (await db.prepare(`INSERT INTO provider_calls (id, session_id, project_id, provider_id, provider_name, stage, model, success, latency_ms, input_tokens, output_tokens, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(randomUUID(), input.sessionId ?? null, input.projectId ?? null, input.providerId ?? null, input.providerName, input.stage, input.model, input.success ? 1 : 0, input.latencyMs, input.inputTokens ?? null, input.outputTokens ?? null, input.error ?? null, now()));
}
export async function ensureFolder(projectId: string, rawPath: string) {
    const clean = normalizeFolderPath(rawPath);
    const parts = clean.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
        const parent = current || null;
        current = current ? `${current}/${part}` : part;
        (await db.prepare(`INSERT OR IGNORE INTO folders (id, project_id, path, name, parent_path, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(randomUUID(), projectId, current, part, parent, now()));
    }
    return clean;
}
export function normalizeFolderPath(value: string) {
    return String(value || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((x) => x.trim().replace(/[^a-zA-Z0-9 _.-]/g, ""))
        .filter(x => Boolean(x) && x !== "." && x !== "..")
        .slice(0, 6)
        .join("/") || "General";
}
export async function indexEntity(entityType: string, entityId: string, title: string, body: string, folderPath = "") {
    (await db.prepare(`DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?`).run(entityType, entityId));
    (await db.prepare(`INSERT INTO search_index (entity_type, entity_id, title, body, path) VALUES (?, ?, ?, ?, ?)`)
        .run(entityType, entityId, title, body, folderPath));
}
export async function getDashboardState() {
 return transaction(async()=>{
    (await recoverInterruptedSessions());
    const projects = (await db.prepare(`SELECT * FROM projects ORDER BY updated_at DESC`).all());
    const folders = (await db.prepare(`SELECT * FROM folders ORDER BY project_id, path`).all());
    const sessions = (await db.prepare(`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY started_at DESC,id DESC) AS recent_rank FROM sessions) WHERE recent_rank<=80 ORDER BY started_at DESC`).all());
    const findings = (await db.prepare(`SELECT * FROM findings ORDER BY created_at DESC`).all());
    const resources = (await db.prepare(`SELECT * FROM resources ORDER BY created_at DESC`).all());
    const clarifications = [
        ...(await db.prepare(`SELECT c.*, 'finding' AS entity_type, f.title AS entity_title FROM clarifications c JOIN findings f ON f.id=c.finding_id WHERE c.status='pending'`).all()),
        ...(await db.prepare(`SELECT c.*, 'resource' AS entity_type, r.title AS entity_title FROM resource_clarifications c JOIN resources r ON r.id=c.resource_id WHERE c.status='pending'`).all())
    ];
    const activity = (await db.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 120`).all());
    const limitations = (await db.prepare(`SELECT * FROM limitations ORDER BY created_at DESC`).all());
    const decisions = (await db.prepare(`SELECT * FROM decisions ORDER BY created_at DESC LIMIT 120`).all());
    const providerCalls = (await db.prepare(`SELECT * FROM provider_calls ORDER BY created_at DESC LIMIT 100`).all());
    const unread = (await db.prepare(`SELECT project_id,COUNT(*) AS count FROM notifications WHERE read_at IS NULL GROUP BY project_id`).all());
    const metrics = (await db.prepare(`SELECT project_id,COUNT(*) AS runs,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,SUM(CASE WHEN parent_session_id IS NOT NULL THEN 1 ELSE 0 END) AS continuations FROM sessions GROUP BY project_id`).all());
    return { projects, folders, sessions, findings, resources, clarifications, activity, limitations, decisions, providerCalls, unread, metrics };
 });
}
export { randomUUID };
