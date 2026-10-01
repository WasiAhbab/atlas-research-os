'use client';
import {createBrowserClient} from '@supabase/ssr';
import {FormEvent,useMemo,useState} from 'react';
import Link from 'next/link';
import {authCallbackUrl} from '@/lib/authNavigation';
export default function AccountAccess({initialMode='login',destination='/workspace',emailEnabled=false,googleVisible=true,googleReady=false,initialError=''}:{initialMode?:string;destination?:string;emailEnabled?:boolean;googleVisible?:boolean;googleReady?:boolean;initialError?:string}) {
 const client=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),[]);
 const [mode,setMode]=useState(emailEnabled?initialMode:'login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(initialError);
 async function continueWithGoogle(){
  if(!googleReady || busy)return;
  setBusy(true);setError('');setMessage('');
  try {
   const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:authCallbackUrl(location.origin,destination),skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
   if(error)throw error;
   if(!data.url)throw new Error('Google sign-in is temporarily unavailable. Please try again.');
   location.assign(data.url);
  }catch {setError('Could not start Google sign-in. Please check your connection and try again.');setBusy(false);}
 }
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(mode==='signup'){
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:authCallbackUrl(location.origin,destination)}});
    if(error)throw error;
    if(data.session) location.assign(destination);
    else setMessage('Check your email to confirm your account. Your private workspace will be ready when you sign in.');
   }else if(mode==='reset'){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:authCallbackUrl(location.origin,'/auth?mode=update')});if(error)throw error;
    setMessage('If this address has an account, a password reset link will arrive shortly.');
   }else if(mode==='update'){
    const {error}=await client.auth.updateUser({password});if(error)throw error;location.assign(destination);
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;location.assign(destination);
   }
  }catch(e){setError(e instanceof Error?e.message:'Could not connect. Please try again.');}
  finally{setBusy(false);}
 }
 return <main className="account-page"><Link className="account-brand" href="/">◈ ATLAS <span>RESEARCH OS</span></Link><div className="account-composition"><section className="account-story"><p className="account-kicker">A place for your next discovery</p><h1>Your ideas.<br/>A world of<br/><em>possibility.</em></h1><p>Research with your choice of AI. Keep every source, decision, and discovery in a workspace that belongs to you.</p><div className="account-promise"><span>01 / Your own models</span><span>02 / Private by default</span><span>03 / Built to continue</span></div></section><section className="account-card"><p className="account-kicker">ATLAS / PRIVATE WORKSPACE</p><h2>{!emailEnabled?'Your next discovery starts here.':mode==='signup'?'Make room for discovery.':mode==='reset'?'Find your way back.':mode==='update'?'A fresh start.':'Welcome back.'}</h2><p>{!emailEnabled?'One account. A workspace that stays yours. Sign in or create your Atlas workspace with Google.':mode==='signup'?'Create your account. Bring your own AI key when you’re ready.':mode==='reset'?'We’ll send you a link to reset your password.':mode==='update'?'Choose a new password for your account.':'Sign in to pick up where you left off.'}</p>{googleVisible && ['login','signup'].includes(mode) && <div className="account-google-section"><button type="button" className="account-google" disabled={busy||!googleReady} onClick={continueWithGoogle} aria-describedby={!googleReady?'google-setup-status':undefined}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.02 46.98 31.86 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.26 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg><span>{busy?'Connecting…':'Continue with Google'}</span></button>{!googleReady?<p id="google-setup-status" className="account-message">Google sign-in is being connected. Please check back shortly.</p>:<p className="account-google-note">Your first sign-in creates a private workspace. Return with the same Google account to continue your research.</p>}{emailEnabled&&<div className="account-divider">or use email</div>}</div>}{error&&<p role="alert" className="account-error">{error}</p>}{message&&<p role="status" className="account-message">{message}</p>}{emailEnabled&&<>{['login','signup'].includes(mode)&&<div className="account-tabs" role="group" aria-label="Account access"><button aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('');setMessage('');}}>Sign in</button><button aria-pressed={mode==='signup'} onClick={()=>{setMode('signup');setError('');setMessage('');}}>Create account</button></div>}<form onSubmit={submit}>{mode!=='update'&&<label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></label>}{mode!=='reset'&&<label>Password<input type="password" required minLength={mode==='login'?1:12} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='signup'?'At least 12 characters':'Your password'}/></label>}<button className="account-submit" disabled={busy}>{busy?'Connecting…':mode==='signup'?'Create your workspace ↗':mode==='reset'?'Send reset link ↗':mode==='update'?'Save new password ↗':'Open your workspace ↗'}</button></form><button className="account-text-button" onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setMessage('');}}>{mode==='reset'?'Back to sign in':'Forgot your password?'}</button></>}<small>Your API keys stay on the server, encrypted at rest.</small></section></div></main>;
}
