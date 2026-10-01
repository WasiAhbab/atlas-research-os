import {sleep} from 'workflow';
import {runSlice,failJob} from '../lib/jobs';
// Only identifiers enter the workflow event log. Keys are decrypted inside a step.
export async function researchWorkflow(accountId:string,jobId:string,generation:number) {
 'use workflow';
 try {
  for(let stage=0;stage<64;stage++) {
   const status=await advance(accountId,jobId,generation);
   if(!['queued','waiting'].includes(status)) return status;
   await sleep(status==='waiting'?'30s':'1s');
  }
  await stop(accountId,jobId,generation);
  return 'failed';
 }catch {await stop(accountId,jobId,generation);return 'failed';}
}
async function advance(accountId:string,jobId:string,generation:number) {
 'use step';
 return runSlice(accountId,jobId,generation);
}
async function stop(accountId:string,jobId:string,generation:number) {
 'use step';
 await failJob(accountId,jobId,generation,'The cloud workflow stopped. Resume from History to use the latest saved checkpoint.');
}
