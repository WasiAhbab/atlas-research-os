import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {asOwner,db,transaction} from '../lib/postgres';
async function main(){
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const file=process.argv[2],owner=process.env.ATLAS_IMPORT_OWNER_ID;
if(!file || !owner){console.error('Usage: ATLAS_IMPORT_OWNER_ID=<your Supabase Auth user UUID> npm run import:local -- /absolute/path/to/data/atlas.db [--apply]');process.exit(1);}
const local=new DatabaseSync(file,{readOnly:true});
const tables=['projects','folders','sessions','findings','resources','clarifications','resource_clarifications','activity_logs','limitations','decisions','provider_calls','notifications','search_index'];
const data=new Map<string,any[]>();
for(const table of tables){const exists=local.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);const rows=exists?local.prepare(`SELECT * FROM ${table}`).all():[];data.set(table,rows);console.log(`${table}: ${rows.length} records`);}
console.log('Provider credentials are excluded. Re-add your AI key in the cloud Provider Vault.');
if(!process.argv.includes('--apply'))console.log('Preview only; add --apply to import into an EMPTY cloud account.');
else await asOwner(owner,()=>transaction(async()=>{
 if(await db.prepare('SELECT id FROM projects LIMIT 1').get())throw new Error('Destination account already has projects. Use a new account and import before opening its workspace.');
 for(const [table,rows] of data){
  for(const row of rows){
   if(table==='sessions' && ['running','queued'].includes(String(row.status)))row.status='interrupted';
   const columns=Object.keys(row).filter(c=>c!=='owner_id');
   if(columns.some(c=>!/^[a-z_]+$/.test(c)))throw new Error('Unexpected database column.');
   await db.prepare(`INSERT INTO ${table}(${columns.map(c=>`"${c}"`).join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...columns.map(c=>row[c]));
  }
 }
 console.log('Import committed. Research, approvals, decisions and history are preserved.');
}));
local.close();

}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Operation failed.");process.exitCode=1;});
