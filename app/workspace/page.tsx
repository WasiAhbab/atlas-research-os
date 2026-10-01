import Dashboard from '@/components/Dashboard';
import AccountMenu from '@/components/AccountMenu';
import {currentUser} from '@/lib/auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Workspace({searchParams}:{searchParams:Promise<Record<string,string>>}){const params=await searchParams;const query=new URLSearchParams();for(const name of ["view","topic"])if(typeof params[name]==="string")query.set(name,params[name].slice(0,2000));const user=await currentUser();if(!user)redirect('/auth?next='+encodeURIComponent('/workspace'+(query.size?'?'+query.toString():'')));return <><AccountMenu email={user.email || ''}/><Dashboard/></>;}
