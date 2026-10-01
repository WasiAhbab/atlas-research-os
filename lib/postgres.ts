import {connectionOptions} from "./connectionOptions";
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(20, Number);
const identity = new AsyncLocalStorage<string>();
const connection = new AsyncLocalStorage<PoolClient>();
let pool: Pool | undefined;
export function ownerId() {
  const id = identity.getStore();
  if (!id) throw new Error('Authentication required.');
  return id;
}
export function asOwner<T>(id: string, fn: () => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid account identity.');
  return identity.run(id, fn);
}
function getPool() {
  return pool ??= new Pool(connectionOptions());
}
// Every SQL operation uses a verified identity, a restricted role, and transaction-local settings.
// Transaction-pooler connections cannot carry an identity into a later request.
export async function transaction<T>(fn: () => Promise<T>, lock = true): Promise<T> {
  if (connection.getStore()) return fn();
  const id = ownerId(), client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",[id,JSON.stringify({sub:id,role:'authenticated'})]);
    await client.query('SET LOCAL search_path=atlas,public');
    await client.query("SET LOCAL statement_timeout='20s'");
    if(lock) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[id]);
    const result = await connection.run(client,fn);
    await client.query('COMMIT');
    return result;
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export function postgresSql(sql:string) {
  let index=0;
  // Application SQL is static. Ignore question marks inside quoted strings.
  sql=sql.replace(/'(?:''|[^'])*'|\?/g, token=>token==='?'?`$${++index}`:token);
  if(/INSERT OR IGNORE/i.test(sql)) sql=sql.replace(/INSERT OR IGNORE/i,'INSERT')+' ON CONFLICT DO NOTHING';
  if(/INSERT OR REPLACE INTO session_leases/i.test(sql)) sql=sql.replace(/INSERT OR REPLACE/i,'INSERT')+' ON CONFLICT(session_id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at,pause_requested=excluded.pause_requested';
  return sql;
}
async function query(sql:string,args:unknown[]) {
  ownerId();
  const run=()=>connection.getStore()!.query(postgresSql(sql),args);
  return connection.getStore()?run():transaction(run,false);
}
export const db = { prepare(sql:string) {return {
  async all(...args:unknown[]):Promise<any[]> {return (await query(sql,args)).rows;},
  async get(...args:unknown[]):Promise<any> {return (await query(sql,args)).rows[0];},
  async run(...args:unknown[]) {const r=await query(sql,args);return {changes:r.rowCount || 0};}
};}};
