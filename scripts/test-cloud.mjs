import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(path.join(process.cwd(),'.atlas-test-'));
try{
 await build({entryPoints:['tests/cloud.test.ts'],outfile:path.join(dir,'test.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'postgres-test-engine',setup(b){b.onResolve({filter:/^pg$/},()=>({path:path.resolve('tests/pglite-driver.ts')}));}}]});
 await import(pathToFileURL(path.join(dir,'test.mjs')).href);
}finally{await rm(dir,{recursive:true,force:true});}
