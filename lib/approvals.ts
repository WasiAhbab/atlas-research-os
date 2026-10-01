import { db, ensureFolder, indexEntity, logActivity, now, randomUUID, transaction, recordLimitation } from "./db";
import { mirrorFinding, mirrorResource } from "./fileMirror";
export async function resolveApproval(id: string, requestedPath: string) {
    const resolved = (await transaction(async () => {
        const findingApproval = (await db.prepare(`SELECT * FROM clarifications WHERE id=? AND status='pending'`).get(id)) as any;
        const approval = findingApproval || (await db.prepare(`SELECT * FROM resource_clarifications WHERE id=? AND status='pending'`).get(id)) as any;
        if (!approval)
            throw new Error("Pending approval not found.");
        const kind = findingApproval ? "finding" : "resource", table = findingApproval ? "findings" : "resources";
        const entity = (await db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(findingApproval ? approval.finding_id : approval.resource_id)) as any;
        if (!entity)
            throw new Error("Research item not found.");
        const folder = (await ensureFolder(approval.project_id, requestedPath || approval.suggested_path));
        (await db.prepare(`UPDATE ${table} SET folder_path=?,status='filed' WHERE id=?`).run(folder, entity.id));
        (await db.prepare(`UPDATE ${findingApproval ? "clarifications" : "resource_clarifications"} SET status='resolved',resolution_path=?,resolved_at=? WHERE id=?`).run(folder, now(), id));
        const tags = findingApproval ? JSON.parse(entity.tags_json) : [];
        (await db.prepare(`INSERT INTO decisions (id,project_id,rule_key,rule_value,reason,created_at) VALUES (?,?,?,?,?,?)`).run(randomUUID(), approval.project_id, `${kind}_classification`, JSON.stringify({ proposed: approval.suggested_path, chosen: folder, tags, url: entity.url }), `Human resolved ${kind} “${entity.title}”.`, now()));
        const content = findingApproval ? `${entity.summary}\n${entity.content}\n${tags.join(" ")}\n${JSON.parse(entity.source_urls_json).join(" ")}` : `${entity.description}\n${entity.url}\n${entity.rationale}`;
        (await indexEntity(kind, entity.id, entity.title, content, folder));
        (await logActivity({ projectId: approval.project_id, sessionId: approval.session_id, action: "clarification.resolved", detail: `Approved ${kind} “${entity.title}” → ${folder}. Decision saved for future research.` }));
        return { entity, kind, folder };
    }));
    const { entity, kind, folder } = resolved;
    try {
        const common = { projectId: entity.project_id, id: entity.id, title: entity.title, folderPath: folder, status: "filed", createdAt: entity.created_at, rationale: entity.rationale };
        if (kind === "finding")
            (await mirrorFinding({ ...common, summary: entity.summary, content: entity.content, confidence: entity.confidence, tags: JSON.parse(entity.tags_json), sourceUrls: JSON.parse(entity.source_urls_json) }));
        else
            (await mirrorResource({ ...common, url: entity.url, description: entity.description }));
    }
    catch (error) {
        (await recordLimitation({ projectId: entity.project_id, sessionId: entity.session_id, code: "FILE_MIRROR_FAILED", title: "Folder mirror needs attention", detail: `The database decision was saved, but its Markdown copy failed: ${error instanceof Error ? error.message : "Unknown error"}` }));
    }
    return { ok: true, folderPath: folder };
}
