import {NextRequest,NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/auth';
import {safeAuthDestination} from '@/lib/authNavigation';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code');
 const next=safeAuthDestination(req.nextUrl.searchParams.get('next'),true);
 // Use the configured deployment origin, not an untrusted forwarded host.
 const origin=process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
 if(code){
  try {const client=await supabaseServer();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,origin));}
  catch {/* Show a recoverable sign-in error without exposing provider details. */}
 }
 const retry=new URL('/auth',origin);
 retry.searchParams.set('error',req.nextUrl.searchParams.get('error')==='access_denied'?'cancelled':'callback');
 retry.searchParams.set('next',safeAuthDestination(next));
 return NextResponse.redirect(retry);
}
