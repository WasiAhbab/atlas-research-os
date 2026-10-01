import fs from 'node:fs';
import crypto from 'node:crypto';
if(!fs.existsSync('.env.local')){
 fs.writeFileSync('.env.local',fs.readFileSync('.env.example','utf8').replace('ATLAS_MASTER_KEY=\n','ATLAS_MASTER_KEY='+crypto.randomBytes(32).toString('base64')+'\n'),{mode:0o600});
 console.log('Created .env.local with a new private encryption key. Add your Supabase connection details there.');
}else console.log('.env.local already exists; it was preserved.');
console.log('Next: follow CLOUD_SETUP.md. Never share or commit .env.local.');
