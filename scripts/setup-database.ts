import fs from 'node:fs';
import {Pool} from 'pg';
import {connectionOptions} from '../lib/connectionOptions';
async function main(){
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const pool=new Pool(connectionOptions());
try{
 const existing=await pool.query("SELECT to_regclass('atlas.projects') AS project_table");
 if(existing.rows[0].project_table)console.log('Atlas tables already exist. Existing research was preserved; no migration was re-applied.');
 else {await pool.query(fs.readFileSync('supabase/migrations/001_atlas.sql','utf8'));console.log('Atlas database created with private ownership policies.');}
 const result=await pool.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='atlas' AND rowsecurity");
 if(Number(result.rows[0].n)!==19)throw new Error('Expected 19 private Atlas tables. Check the schema before continuing.');
 console.log('Verified: all 19 Atlas tables have row-level security enabled.');
}catch(error){console.error('Database setup did not complete:',error instanceof Error?error.message:'connection failure');process.exitCode=1;}
finally{await pool.end();}

}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Operation failed.");process.exitCode=1;});
