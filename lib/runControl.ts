import { db, now, logActivity } from './db';
export class ResearchPaused extends Error { constructor(){super('Research paused at a saved checkpoint.');} }
export class ResearchYield extends ResearchPaused {}
export async function checkPause(sessionId:string) {
 const job=await db.prepare(`SELECT pause_requested,status FROM research_jobs WHERE session_id=?`).get(sessionId);
 if(job?.pause_requested || job && !['running','queued'].includes(job.status)) throw new ResearchPaused();
}
export async function saveCheckpoint(sessionId:string,checkpoint:Record<string,unknown>) {
 await db.prepare(`UPDATE sessions SET checkpoint_json=?,updated_at=? WHERE id=?`).run(JSON.stringify(checkpoint),now(),sessionId);
 const session=await db.prepare(`SELECT project_id FROM sessions WHERE id=?`).get(sessionId);
 await logActivity({projectId:session.project_id,sessionId,action:'checkpoint.saved',detail:`Saved ${checkpoint.stage}.`});
 await checkPause(sessionId);
 // End the invocation at a durable boundary. The orchestrator schedules the next stage.
 if(['evidence_complete','synthesis_complete','result_ready'].includes(String(checkpoint.stage))) throw new ResearchYield();
}
