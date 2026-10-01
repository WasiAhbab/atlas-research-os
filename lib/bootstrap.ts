import {db,transaction,now,randomUUID,ensureFolder,logActivity} from './db';
export async function bootstrapWorkspace(){
 await transaction(async()=>{
  if(await db.prepare(`SELECT id FROM projects LIMIT 1`).get())return;
  const id=randomUUID();
  await db.prepare(`INSERT INTO projects(id,name,topic,instructions,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(id,'My research','Your next research question','Prefer primary sources. Keep uncertainty visible.',now(),now());
  for(const path of ['Research','Sources','Open Questions'])await ensureFolder(id,path);
  await logActivity({projectId:id,action:'workspace.created',detail:'Your private workspace is ready. Add your AI key in Providers & settings, or try a clearly labelled demo run.'});
 });
}
