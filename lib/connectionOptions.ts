import {SUPABASE_ROOT_CA} from "./supabaseCertificate";
import type {PoolConfig} from 'pg';
export function connectionOptions():PoolConfig {
 const value=process.env.DATABASE_URL;
 if(!value)throw new Error('Cloud database is not configured.');
 const url=new URL(value);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL must be a PostgreSQL connection URI.');
 // URL SSL options must not override certificate verification below.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 return {connectionString:url.toString(),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.SUPABASE_DB_CA?process.env.SUPABASE_DB_CA.replaceAll('\\n','\n'):SUPABASE_ROOT_CA}};
}
