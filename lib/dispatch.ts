import {start} from 'workflow/api';
import {researchWorkflow} from '../workflows/research';
import {enqueueResearch,failJob} from './jobs';
import {db} from './db';
export async function dispatchResearch(input:Parameters<typeof enqueueResearch>[0]) {
 const job=await enqueueResearch(input);
 try {
  const run=await start(researchWorkflow,[job.ownerId,job.jobId,job.generation]);
  await db.prepare(`UPDATE research_jobs SET workflow_id=? WHERE id=? AND generation=?`).run(run.runId,job.jobId,job.generation);
 }catch{
  await failJob(job.ownerId,job.jobId,job.generation,'The cloud queue could not start. Use Resume in History to try again.');
  throw new Error('Research was saved, but the cloud queue could not start. Resume it from History.');
 }
 return {sessionId:job.sessionId,status:'queued'};
}
