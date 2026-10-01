import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { asOwner, db, transaction } from './postgres';
export function cloudConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.DATABASE_URL && process.env.ATLAS_MASTER_KEY); }
export async function supabaseServer() {
  const jar=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:values=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server component refresh is handled by proxy. */}}}});
}
export async function currentUser() {
  if(!cloudConfigured()) return null;
  const client=await supabaseServer();
  const {data:{user},error}=await client.auth.getUser();
  return error?null:user;
}
export function secureRoute(fn:(req:NextRequest,context:any)=>Promise<Response>) {
 return async(req:NextRequest,context:any)=>{
  if(!cloudConfigured()) return NextResponse.json({error:'Cloud setup is not complete. See the deployment guide.'},{status:503});
  if(!['GET','HEAD'].includes(req.method)) {
   const origin=req.headers.get('origin');
   const expected=process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
   if(origin && origin!==new URL(expected).origin) return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
   if(Number(req.headers.get('content-length')||0)>65536) return NextResponse.json({error:'Request is too large.'},{status:413});
  }
  if(!['GET','HEAD'].includes(req.method) && (await req.clone().arrayBuffer()).byteLength>65536) return NextResponse.json({error:'Request is too large.'},{status:413});
  const user=await currentUser();
  if(!user) return NextResponse.json({error:'Please sign in again.'},{status:401});
  return asOwner(user.id,async()=>{
   try {
    if(!['GET','HEAD'].includes(req.method)) {
     const allowed=await transaction(async()=>{
      const row=await db.prepare(`INSERT INTO api_limits(bucket,window_start,requests) VALUES('writes',now(),1) ON CONFLICT(owner_id,bucket) DO UPDATE SET requests=CASE WHEN api_limits.window_start<now()-interval '1 minute' THEN 1 ELSE api_limits.requests+1 END,window_start=CASE WHEN api_limits.window_start<now()-interval '1 minute' THEN now() ELSE api_limits.window_start END RETURNING requests`).get();
      return row.requests<=30;
     });
     if(!allowed) return NextResponse.json({error:'Please wait a minute before making more changes.'},{status:429});
    }
    const result=await fn(req,context);result.headers.set('Cache-Control','private, no-store');return result;
   }catch{ return NextResponse.json({error:'Atlas could not complete this request. Check the connection and try again.'},{status:500}); }
  });
 };
}
