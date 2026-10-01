import fs from 'node:fs';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','DATABASE_URL','ATLAS_MASTER_KEY','NEXT_PUBLIC_APP_URL'];
let missing=false;
for(const name of required){const present=Boolean(process.env[name]?.trim());console.log(`${present?'OK':'MISSING'} ${name}`);missing ||= !present;}
if(process.env.ATLAS_MASTER_KEY && process.env.ATLAS_MASTER_KEY.length<43){console.log('ATLAS_MASTER_KEY must have at least 32 random bytes encoded as base64.');missing=true;}
const method=process.env.ATLAS_AUTH_METHOD || 'google';
if(!['google','email','both'].includes(method)){console.log('ATLAS_AUTH_METHOD must be google, email, or both.');missing=true;}
if(method!=='email' && process.env.ATLAS_GOOGLE_AUTH_ENABLED!=='true'){console.log('PENDING Google sign-in: complete GOOGLE_SIGN_IN.md before setting ATLAS_GOOGLE_AUTH_ENABLED=true.');missing=true;}
console.log('This checks configuration presence only. Run npm run doctor for local verification, then test signup and one research run against your Supabase project.');
process.exitCode=missing?1:0;
