'use client';
import {createBrowserClient} from '@supabase/ssr';
import {useState} from 'react';
export default function AccountMenu({email}:{email:string}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div className="account-toolbar"><span title={email}>◈ Private workspace <small>{email}</small></span><a href="/api/export" download>Export data</a><button disabled={busy} onClick={async()=>{setBusy(true);const c=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);const {error}=await c.auth.signOut();if(error){setError('Sign out failed. Try again.');setBusy(false);}else location.assign('/');}}>{busy?'Signing out…':'Sign out'}</button>{error&&<span role="alert">{error}</span>}</div>;
}
