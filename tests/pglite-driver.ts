import {PGlite} from '@electric-sql/pglite';
export const engine=new PGlite();
let tail:Promise<void>=Promise.resolve();
export const types={setTypeParser(){}};
export class Pool {
 async connect(){let release!:()=>void;const pending=tail;tail=new Promise(r=>release=r);await pending;return {query:async(text:string,args:unknown[]=[])=>{const result=await engine.query(text,args);return {...result,rowCount:result.affectedRows ?? result.rows.length};},release};}
}
