import {secureRoute} from '@/lib/auth';
import {db,transaction} from '@/lib/db';
export const runtime='nodejs';
export const GET=secureRoute(async()=>{
 const tables=['projects','folders','sessions','findings','resources','clarifications','resource_clarifications','activity_logs','limitations','decisions','provider_calls','notifications','documents'];
 const data=await transaction(async()=>{const result:Record<string,unknown>={};for(const table of tables){const rows=await db.prepare(`SELECT * FROM ${table}`).all();result[table]=rows.map(({owner_id,...row})=>row);}return result;});
 return Response.json({format:'atlas-cloud-export-v1',exportedAt:new Date().toISOString(),data},{headers:{'Content-Disposition':'attachment; filename="atlas-private-research.json"','Cache-Control':'private, no-store'}});
});
