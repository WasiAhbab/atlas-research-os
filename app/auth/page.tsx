import AccountAccess from '@/components/AccountAccess';
import {cloudConfigured} from '@/lib/auth';
import Link from 'next/link';
import {safeAuthDestination} from '@/lib/authNavigation';
export const dynamic='force-dynamic';
export default async function AuthPage({searchParams}:{searchParams:Promise<{mode?:string;error?:string;next?:string}>}) {
 const query=await searchParams;
 const destination=safeAuthDestination(query.next);
 if(!cloudConfigured()) return <main className="account-page"><Link href="/" className="account-brand">◈ ATLAS <span>RESEARCH OS</span></Link><section className="account-card setup-card"><p className="account-kicker">CLOUD EDITION</p><h1>Almost ready<br/>for discovery.</h1><p>This copy needs its Supabase connection before accounts can be created. Follow <strong>CLOUD_SETUP.md</strong> in the project to connect your database and enable sign-in.</p><p>Your existing local workspace is still available in the original project.</p><Link className="account-submit" href="/">Explore Atlas ↗</Link></section></main>;
 const method=process.env.ATLAS_AUTH_METHOD || 'google';
 const initialError=query.error==='cancelled'?'Sign-in was cancelled. You can try again when you’re ready.':query.error?'Sign-in could not be completed. Please try again from this browser.':'';
 return <AccountAccess destination={destination} initialMode={['signup','reset','update'].includes(query.mode || '')?query.mode:'login'} emailEnabled={method==='email'||method==='both'} googleVisible={method!=='email'} googleReady={process.env.ATLAS_GOOGLE_AUTH_ENABLED==='true'} initialError={initialError}/>;
}
