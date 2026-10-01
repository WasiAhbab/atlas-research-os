import {db,transaction,now,randomUUID,logActivity,recoverInterruptedSessions,recordLimitation} from './db';
import {getProviderCandidates} from './providers';
import {ownerId,asOwner} from './postgres';
import {executeResearch} from './research';
export async function enqueueResearch(input:{projectId:string;topic:string;instructions:string;providerId?:string;resumeSessionId?:string}) {
 await recoverInterruptedSessions();
 if(input.topic.length>2000 || input.instructions.length>20000) throw new Error('Please shorten the topic or instructions.');
 return transaction(async()=>{
  const project=await db.prepare(`SELECT id FROM projects WHERE id=?`).get(input.projectId);
  if(!project) throw new Error('Project not found.');
  const active=await db.prepare(`SELECT id FROM research_jobs WHERE project_id=? AND status IN ('running','queued')`).get(input.projectId);
  if(active) throw new Error('Research is already running in this workspace.');
  const prior=input.resumeSessionId?await db.prepare(`SELECT * FROM sessions WHERE id=? AND project_id=?`).get(input.resumeSessionId,input.projectId):null;
  if(input.resumeSessionId && !prior) throw new Error('Session not found.');
  const quota=await db.prepare(`SELECT count(*) AS n FROM activity_logs WHERE action='research.queued' AND created_at>=?`).get(new Date(Date.now()-86400000).toISOString());
  if(Number(quota.n)>=50) throw new Error('The daily limit of 50 research starts has been reached. Try again tomorrow.');
  const providers=await getProviderCandidates(input.providerId || 'auto');
  if(input.providerId && input.providerId!=='auto' && !providers.length) throw new Error('Select an available provider.');
  const continuing=prior?.status==='completed';
  const sessionId=prior&&!continuing?prior.id:randomUUID();
  if(prior&&!continuing) await db.prepare(`UPDATE sessions SET status='queued',instructions=?,error=NULL,updated_at=? WHERE id=?`).run(input.instructions,now(),sessionId);
  else await db.prepare(`INSERT INTO sessions(id,project_id,topic,instructions,status,provider,model,started_at,updated_at,parent_session_id) VALUES(?,?,?,?,'queued',?,?,?,?,?)`).run(sessionId,input.projectId,input.topic,input.instructions,providers[0]?.name || 'demo',providers[0]?.model || 'demo',now(),now(),continuing?prior.id:null);
  const existing=await db.prepare(`SELECT id,generation FROM research_jobs WHERE session_id=?`).get(sessionId);
  const id=existing?.id || randomUUID(), generation=(existing?.generation || 0)+1;
  await db.prepare(`INSERT INTO research_jobs(id,project_id,session_id,status,generation,provider_id,updated_at) VALUES(?,?,?,'queued',?,?,?) ON CONFLICT(id) DO UPDATE SET status='queued',generation=excluded.generation,provider_id=excluded.provider_id,failed_providers='[]',pause_requested=0,updated_at=excluded.updated_at`).run(id,input.projectId,sessionId,generation,input.providerId || 'auto',now());
  await logActivity({projectId:input.projectId,sessionId,action:'research.queued',detail:continuing?`Continuing saved session ${prior.id}.`:'Research queued; this browser can be closed safely.'});
  return {jobId:id,ownerId:ownerId(),generation,sessionId,status:'queued'};
 });
}
export async function runSlice(accountId:string,jobId:string,generation:number):Promise<string> {
 return asOwner(accountId,async()=>{
  const job=await db.prepare(`SELECT * FROM research_jobs WHERE id=?`).get(jobId);
  if(!job || job.generation!==generation || !['queued','running'].includes(job.status)) return 'stopped';
  const session=await db.prepare(`SELECT * FROM sessions WHERE id=?`).get(job.session_id);
  if(session.status==='completed') {await db.prepare(`UPDATE research_jobs SET status='completed',updated_at=? WHERE id=?`).run(now(),jobId);return 'completed';}
  if(job.pause_requested) {
   await db.prepare(`UPDATE sessions SET status='paused',updated_at=? WHERE id=?`).run(now(),session.id);
   await db.prepare(`UPDATE research_jobs SET status='paused',updated_at=? WHERE id=?`).run(now(),jobId);
   return 'paused';
  }
  const lease=await db.prepare(`SELECT 1 FROM session_leases WHERE session_id=? AND expires_at>=?`).get(session.id,now());
  if(lease) return 'waiting';
  await db.prepare(`UPDATE research_jobs SET status='running',updated_at=? WHERE id=? AND generation=?`).run(now(),jobId,generation);
  try {
   const result=await executeResearch({projectId:session.project_id,topic:session.topic,instructions:session.instructions,providerId:job.provider_id,resumeSessionId:session.id});
   await db.prepare(`UPDATE research_jobs SET status=?,updated_at=? WHERE id=? AND generation=?`).run(result.status,now(),jobId,generation);
   return result.status;
  }catch(error){if(error instanceof Error && /already running/.test(error.message))return 'waiting';await failJob(accountId,jobId,generation,error instanceof Error?error.message:'Research could not finish.');return 'failed';}
 });
}
export async function failJob(accountId:string,jobId:string,generation:number,detail:string) {
 return asOwner(accountId,()=>transaction(async()=>{
  const job=await db.prepare(`SELECT * FROM research_jobs WHERE id=? AND generation=? AND status IN ('queued','running')`).get(jobId,generation);
  if(!job) return;
  await db.prepare(`UPDATE research_jobs SET status='failed',updated_at=? WHERE id=?`).run(now(),jobId);
  await db.prepare(`UPDATE sessions SET status='failed',error=?,updated_at=? WHERE id=? AND status!='completed'`).run(detail,now(),job.session_id);
  await recordLimitation({projectId:job.project_id,sessionId:job.session_id,code:'CLOUD_JOB_FAILED',title:'Research needs attention',detail});
 }));
}
