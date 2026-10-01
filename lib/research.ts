import { db, ensureFolder, indexEntity, logActivity, normalizeFolderPath, now, randomUUID, recordLimitation, transaction, notify, recoverInterruptedSessions } from "./db";
import { getProviderCandidates, updateProviderHealth } from "./providers";
import { runProviderResearch } from "./universalResearch";
import type { ResearchRunResult } from "./types";
import { mirrorFinding, mirrorResource, mirrorSession } from "./fileMirror";
import { retrieveMemory } from "./knowledge";
import { checkPause, ResearchPaused, ResearchYield, saveCheckpoint } from "./runControl";
export async function executeResearch(input: {
    projectId: string;
    topic: string;
    instructions: string;
    providerId?: string;
    resumeSessionId?: string;
}) {
    (await recoverInterruptedSessions());
    const project = (await db.prepare(`SELECT * FROM projects WHERE id=?`).get(input.projectId)) as any;
    if (!project)
        throw new Error("Project not found.");
    const priorSession = input.resumeSessionId ? (await db.prepare(`SELECT * FROM sessions WHERE id=? AND project_id=?`).get(input.resumeSessionId, input.projectId)) as any : null;
    if (input.resumeSessionId && !priorSession)
        throw new Error("Saved research session not found.");
    const continuing = priorSession?.status === "completed";
    const retrying = priorSession && !continuing;
    const sessionId = retrying ? priorSession.id : randomUUID();
    const owner = randomUUID();
    const expires = () => new Date(Date.now() + 240000).toISOString();
    const savedResult = retrying ? parseJson(priorSession.checkpoint_json, {}) as any : {};
    const canRestoreResult = retrying && savedResult.stage === "result_ready" && savedResult.result && input.instructions === priorSession.instructions && (!input.providerId || input.providerId === "auto" || input.providerId === savedResult.providerId);
    const candidates = canRestoreResult ? [] : (await getProviderCandidates(input.providerId || "auto"));
    if (!canRestoreResult && input.providerId && input.providerId !== "auto" && !candidates.length)
        throw new Error("The selected provider is unavailable. Choose an enabled provider.");
    (await transaction(async () => {
        if (priorSession && ((await db.prepare(`SELECT 1 FROM session_leases WHERE session_id=? AND expires_at>=?`).get(priorSession.id, now()))))
            throw new Error("This research session is already running.");
        // Serialize runs in a workspace to prevent duplicate continuation submissions.
        if ((await db.prepare(`SELECT 1 FROM session_leases l JOIN sessions s ON s.id=l.session_id WHERE s.project_id=? AND l.expires_at>=?`).get(input.projectId, now())))
            throw new Error("Research is already running in this workspace.");
        if (!retrying)
            (await db.prepare(`INSERT INTO sessions (id,project_id,topic,instructions,status,provider,model,started_at,updated_at,parent_session_id) VALUES (?,?,?,?,'running',?,?,?,?,?)`).run(sessionId, input.projectId, input.topic, input.instructions, candidates[0]?.name || "demo", candidates[0]?.model || "demo", now(), now(), continuing ? priorSession.id : null));
        else
            (await db.prepare(`UPDATE sessions SET status='running',instructions=?,error=NULL,updated_at=? WHERE id=?`).run(input.instructions, now(), sessionId));
        (await db.prepare(`INSERT OR REPLACE INTO session_leases (session_id,owner,expires_at,pause_requested) VALUES (?,?,?,0)`).run(sessionId, owner, expires()));
        (await logActivity({ projectId: input.projectId, sessionId, action: priorSession ? "research.resumed" : "research.started", detail: continuing ? `Continued saved session ${priorSession.id}; earlier history is preserved.` : retrying ? "Resuming from the latest durable checkpoint." : `Started research on “${input.topic}”.` }));
    }));
    try {
        const memory = (await retrieveMemory(input.projectId, input.topic, input.instructions));
        (await logActivity({ projectId: input.projectId, sessionId, action: "memory.recalled", detail: `Recalled ${memory.entries.length} relevant records and ${memory.decisions.length} organization decisions. Records: ${memory.entries.map(e => e.id).join(", ") || "none"}.` }));
        const existingFolders = ((await db.prepare(`SELECT path FROM folders WHERE project_id=? ORDER BY path`).all(input.projectId)) as any[]).map(f => f.path);
        const savedCheckpoint = priorSession ? parseJson(priorSession.checkpoint_json, {}) as any : {};
        const completedFindings = priorSession ? ((await db.prepare(`SELECT title,summary,folder_path FROM findings WHERE session_id=? ORDER BY created_at`).all(priorSession.id)) as any[]) : [];
        const checkpoint = { ...savedCheckpoint, completedFindings };
        let result: ResearchRunResult;
        if (canRestoreResult) {
            result = savedCheckpoint.result;
            if(result.providerId) await updateProviderHealth(result.providerId,true);
            const job=await db.prepare(`SELECT failed_providers FROM research_jobs WHERE session_id=?`).get(sessionId);
            const failed=JSON.parse(job?.failed_providers || '[]');
            if(failed.length && !result.payload.limitations.some(x=>x.code==='PROVIDER_FAILOVER_USED')) result.payload.limitations.push({code:'PROVIDER_FAILOVER_USED',title:'Automatic provider failover was used',detail:`Atlas completed with ${result.provider} after ${failed.length} failed provider attempt(s). See provider history for details.`});
            (await logActivity({ projectId: input.projectId, sessionId, action: "checkpoint.reused", detail: "Reused the complete saved research result; no provider call required." }));
        }
        else {
            // Never replace an interrupted paid research run with demo data.
            if (retrying && priorSession.provider !== "demo" && !candidates.length)
                throw new Error("Reconnect the research provider before resuming this live session.");
            result = candidates.length ? await runWithFailover({ ...input, sessionId, existingFolders, priorDecisions: memory.decisions, resumeCheckpoint: checkpoint, candidates, resumed: Boolean(priorSession), memory: memory.text }) : demoResult(input.topic, input.instructions, existingFolders);
            (await saveCheckpoint(sessionId, { stage: "result_ready", result, providerId: result.providerId ?? null, savedAt: now() }));
        }
        (await checkPause(sessionId));
        const summary = (await commitResearchResult(input.projectId, sessionId, result));
        const completedAt = now();
        // The database is authoritative; mirrors are repairable and any failure is surfaced.
        for (const f of (await db.prepare(`SELECT * FROM findings WHERE session_id=?`).all(sessionId)) as any[])
            (await tryMirror(input.projectId, sessionId, "finding", async () => (await mirrorFinding({ projectId: input.projectId, id: f.id, title: f.title, summary: f.summary, content: f.content, folderPath: f.folder_path, confidence: f.confidence, status: f.status, tags: JSON.parse(f.tags_json), sourceUrls: JSON.parse(f.source_urls_json), rationale: f.rationale, createdAt: f.created_at }))));
        for (const r of (await db.prepare(`SELECT * FROM resources WHERE session_id=?`).all(sessionId)) as any[])
            (await tryMirror(input.projectId, sessionId, "resource", async () => (await mirrorResource({ projectId: input.projectId, id: r.id, title: r.title, url: r.url, description: r.description, folderPath: r.folder_path, status: r.status, rationale: r.rationale, createdAt: r.created_at }))));
        (await tryMirror(input.projectId, sessionId, "session", async () => (await mirrorSession({ projectId: input.projectId, sessionId, payload: { topic: input.topic, instructions: input.instructions, ...summary, completedAt } }))));
        return { sessionId, provider: result.provider, providerId: result.providerId, model: result.model, checkpoint: summary, status: "completed" };
    }
    catch (error) {
        if (error instanceof ResearchYield) {
            await db.prepare(`UPDATE sessions SET status='queued',updated_at=? WHERE id=?`).run(now(),sessionId);
            return {sessionId,status:"queued"};
        }
        if (error instanceof ResearchPaused) {
            (await db.prepare(`UPDATE sessions SET status='paused',updated_at=? WHERE id=?`).run(now(), sessionId));
            (await logActivity({ projectId: input.projectId, sessionId, action: "research.paused", detail: "Paused safely after saving the current stage." }));
            (await notify({ projectId: input.projectId, sessionId, title: "Research paused", detail: "Your completed stages are saved. Resume from History whenever you are ready.", destination: "history" }));
            return { sessionId, status: "paused" };
        }
        const message = error instanceof Error ? error.message : "Unknown research failure";
        (await db.prepare(`UPDATE sessions SET status='failed',error=?,updated_at=? WHERE id=? AND status!='completed'`).run(message, now(), sessionId));
        (await recordLimitation({ projectId: input.projectId, sessionId, code: "RESEARCH_RUN_FAILED", title: "Research could not finish", detail: message }));
        throw error;
    }
    finally {

        (await db.prepare(`DELETE FROM session_leases WHERE session_id=? AND owner=?`).run(sessionId, owner));
    }
}
/** Commit all entities, indexes, approvals, and the completion checkpoint atomically. */
export async function commitResearchResult(projectId: string, sessionId: string, result: ResearchRunResult) {
    return (await transaction(async () => {
        const session = (await db.prepare(`SELECT * FROM sessions WHERE id=?`).get(sessionId)) as any;
        if (session.status === "completed")
            return JSON.parse(session.checkpoint_json);
        const threshold = Math.max(0, Math.min(1, Number(process.env.AUTO_FILE_CONFIDENCE || 0.78)));
        const titles = new Set(((await db.prepare(`SELECT title FROM findings WHERE project_id=?`).all(projectId)) as any[]).map(f => normalizeTitle(f.title)));
        let filed = 0, needsApproval = 0, duplicatesSkipped = 0, resourcesFiled = 0, resourcesReview = 0;
        for (const f of result.payload.findings) {
            if (titles.has(normalizeTitle(f.title))) {
                duplicatesSkipped++;
                (await logActivity({ projectId, sessionId, action: "finding.duplicate_skipped", detail: `Already stored: ${f.title}` }));
                continue;
            }
            titles.add(normalizeTitle(f.title));
            const id = randomUUID(), created = now(), proposed = normalizeFolderPath(f.recommendedFolderPath), confident = f.confidence >= threshold;
            const folder = confident ? (await ensureFolder(projectId, proposed)) : null;
            (await db.prepare(`INSERT INTO findings (id,session_id,project_id,title,summary,content,folder_path,confidence,status,source_urls_json,tags_json,rationale,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, sessionId, projectId, f.title, f.summary, f.content, folder, f.confidence, confident ? "filed" : "needs_approval", JSON.stringify(f.sourceUrls), JSON.stringify(f.tags), f.rationale, created));
            (await indexEntity("finding", id, f.title, `${f.summary}\n${f.content}\n${f.tags.join(" ")}\n${f.sourceUrls.join(" ")}`, folder || `Needs Approval → ${proposed}`));
            if (confident)
                filed++;
            else {
                needsApproval++;
                (await db.prepare(`INSERT INTO clarifications (id,session_id,project_id,finding_id,reason,suggested_path,confidence,status,created_at) VALUES (?,?,?,?,?,?,?,'pending',?)`).run(randomUUID(), sessionId, projectId, id, f.rationale, proposed, f.confidence, created));
            }
            (await logActivity({ projectId, sessionId, action: confident ? "finding.auto_filed" : "clarification.requested", detail: `${f.title} → ${confident ? proposed : "awaiting approval"}` }));
        }
        for (const source of result.sources) {
            if ((await db.prepare(`SELECT id FROM resources WHERE project_id=? AND url=?`).get(projectId, source.url)))
                continue;
            const placement = result.payload.resourcePlacements?.find(p => p.url === source.url);
            const proposed = normalizeFolderPath(placement?.recommendedFolderPath || "Sources/Review");
            const confidence = placement?.confidence ?? 0;
            const rationale = placement?.rationale || "No reliable folder recommendation was returned. Please choose where this source belongs.";
            const confident = confidence >= threshold, folder = confident ? (await ensureFolder(projectId, proposed)) : null, id = randomUUID(), created = now();
            const description = `Source captured from ${result.provider} search metadata${source.domain ? ` · ${source.domain}` : ""}.`;
            (await db.prepare(`INSERT INTO resources (id,session_id,project_id,title,url,description,folder_path,created_at,status,confidence,rationale) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, sessionId, projectId, source.title, source.url, description, folder, created, confident ? "filed" : "needs_approval", confidence, rationale));
            (await indexEntity("resource", id, source.title, `${description}\n${source.url}\n${rationale}`, folder || `Needs Approval → ${proposed}`));
            if (confident)
                resourcesFiled++;
            else {
                resourcesReview++;
                (await db.prepare(`INSERT INTO resource_clarifications (id,session_id,project_id,resource_id,reason,suggested_path,confidence,created_at) VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), sessionId, projectId, id, rationale, proposed, confidence, created));
            }
            (await logActivity({ projectId, sessionId, action: confident ? "resource.auto_filed" : "resource.approval_requested", detail: `${source.title} → ${confident ? proposed : "awaiting approval"}` }));
        }
        for (const limitation of result.payload.limitations)
            (await recordLimitation({ projectId, sessionId, ...limitation }));
        if (needsApproval + resourcesReview)
            (await notify({ projectId, sessionId, title: "Your filing decisions are needed", detail: `${needsApproval} finding${needsApproval === 1 ? "" : "s"} and ${resourcesReview} resource${resourcesReview === 1 ? "" : "s"} need your approval.`, destination: "approvals" }));
        const checkpoint = { stage: "ready_to_resume", completedAt: now(), findingsCreated: filed + needsApproval, filed, needsApproval, resourcesFiled, resourcesReview, duplicatesSkipped, sourcesCaptured: result.sources.length, nextTasks: result.payload.nextTasks, lastExecutiveSummary: result.payload.executiveSummary, provider: result.provider, providerId: result.providerId ?? null, model: result.model };
        (await db.prepare(`UPDATE sessions SET status='completed',provider=?,model=?,executive_summary=?,checkpoint_json=?,state_json=?,updated_at=?,completed_at=? WHERE id=?`).run(result.provider, result.model, result.payload.executiveSummary, JSON.stringify(checkpoint), JSON.stringify(result.rawState || {}), now(), now(), sessionId));
        (await db.prepare(`UPDATE projects SET topic=?,instructions=?,updated_at=? WHERE id=?`).run(session.topic, session.instructions, now(), projectId));
        (await logActivity({ projectId, sessionId, action: "research.completed", detail: `Saved ${filed + needsApproval} findings, ${resourcesFiled + resourcesReview} resources; ${duplicatesSkipped} duplicates skipped.` }));
        (await notify({ projectId, sessionId, title: "Research completed", detail: `${session.topic}: ${filed + needsApproval} finding${filed + needsApproval === 1 ? "" : "s"} saved.`, destination: "history" }));
        return checkpoint;
    }));
}
async function runWithFailover(input: {
    projectId: string;
    topic: string;
    instructions: string;
    providerId?: string;
    sessionId: string;
    existingFolders: string[];
    priorDecisions: any[];
    resumeCheckpoint?: unknown;
    candidates: any[];
    resumed: boolean;
    memory: string;
}) {
    const job=await db.prepare(`SELECT failed_providers FROM research_jobs WHERE session_id=?`).get(input.sessionId);
    const failed:string[]=JSON.parse(job?.failed_providers || '[]');
    const previous=input.resumeCheckpoint as any;
    input.candidates=input.candidates.filter(p=>!failed.includes(p.id)).sort((a,b)=>Number(b.id===previous?.providerId)-Number(a.id===previous?.providerId));
    const failures: string[] = [...failed];
    const auto = !input.providerId || input.providerId === "auto";
    for (let i = 0; i < input.candidates.length; i++) {
        const provider = input.candidates[i];
        try {
            (await logActivity({ projectId: input.projectId, sessionId: input.sessionId, action: "provider.attempt", detail: `Using ${provider.name} (${provider.model}) for research${auto ? " via auto-router" : ""}.` }));
            const result = await runProviderResearch({
                provider,
                projectId: input.projectId,
                sessionId: input.sessionId,
                topic: input.topic,
                instructions: input.instructions,
                existingFolders: input.existingFolders,
                priorDecisions: input.priorDecisions,
                checkpoint: input.resumeCheckpoint,
                resume: input.resumed,
                memory: input.memory,
            });
            (await updateProviderHealth(provider.id, true));
            if (failures.length) {
                result.payload.limitations.push({
                    code: "PROVIDER_FAILOVER_USED",
                    title: "Automatic provider failover was used",
                    detail: `Atlas continued with ${provider.name} after earlier provider attempt(s) failed: ${failures.join(" | ")}`
                });
            }
            return result;
        }
        catch (error) {
            if (error instanceof ResearchPaused)
                throw error;
            const message = error instanceof Error ? error.message : "Unknown provider failure";
            (await updateProviderHealth(provider.id, false, message));
            failures.push(`${provider.name}: ${message}`);
            (await logActivity({ projectId: input.projectId, sessionId: input.sessionId, action: "provider.failed", detail: `${provider.name} failed: ${message}`, severity: "warning" }));
            if (!auto) throw error;
            failed.push(provider.id);
            await db.prepare(`UPDATE research_jobs SET failed_providers=?,updated_at=? WHERE session_id=?`).run(JSON.stringify(failed),now(),input.sessionId);
            if(i+1<input.candidates.length) throw new ResearchYield();
        }
    }
    throw new Error(`Every configured AI provider failed. ${failures.join(" | ")}`);
}
function demoResult(topic: string, instructions: string, existingFolders: string[]): ResearchRunResult {
    const cleanTopic = topic.trim() || "Untitled research topic";
    const base = existingFolders[0] ?? "Research/Findings";
    return {
        provider: "demo",
        model: "demo-mode",
        sources: [],
        payload: {
            executiveSummary: `Demo research workspace initialized for “${cleanTopic}”. Add any supported AI provider in the Provider Vault to switch to live research.`,
            findings: [
                { title: `Research frame for ${cleanTopic}`, summary: "The topic has been converted into a traceable research unit with explicit scope, organization confidence, and a resumable checkpoint.", content: `Requested instructions: ${instructions || "No additional instructions supplied."}\n\nIn live mode Atlas can route this same workflow through Gemini, Claude, OpenAI, OpenRouter, Groq, Mistral, xAI, DeepSeek, Together, or another OpenAI-compatible endpoint.`, recommendedFolderPath: base, confidence: 0.92, tags: ["research-frame", "scope"], sourceUrls: [], rationale: "High-confidence placement because this item describes the research scope itself." },
                { title: "Example ambiguous finding requiring human approval", summary: "This item deliberately demonstrates the human-in-the-loop filing gate.", content: "When Atlas is uncertain about organization, it does not silently guess. It leaves the item in Needs Approval and asks the user to confirm or choose another folder.", recommendedFolderPath: "Open Questions/Needs Review", confidence: 0.61, tags: ["approval", "governance"], sourceUrls: [], rationale: "The content could reasonably belong to governance, open questions, or architecture, so user confirmation is appropriate." }
            ],
            suggestedFolders: ["Sources", "Open Questions", "Research/Findings"],
            nextTasks: ["Connect an AI provider", "Test the provider", "Run live research", "Resolve the pending classification", "Resume the same session"],
            limitations: [{ code: "NO_AI_PROVIDER_CONFIGURED", title: "No live AI provider configured", detail: "Atlas ran in transparent demo mode. Add any supported API provider in System → AI Provider Vault for live model research." }]
        }
    };
}
async function tryMirror(projectId: string, sessionId: string, entity: string, fn: () => Promise<unknown>) {
    try {
        await fn();
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown file mirror error";
        (await recordLimitation({ projectId, sessionId, code: "FILE_MIRROR_FAILED", title: "Markdown folder mirror could not be updated", detail: `${entity}: ${detail}. The database copy remains intact.` }));
    }
}
function normalizeTitle(value: string) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function parseJson(value: string, fallback: unknown) {
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
