import {createServerClient} from '@supabase/ssr';
import {NextRequest,NextResponse} from 'next/server';
export async function proxy(request:NextRequest) {
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url || !key) return response;
 const client=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 await client.auth.getUser();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/workspace/:path*','/auth/:path*','/api/:path*']};
