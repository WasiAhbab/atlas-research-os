"use client";
import { useEffect, useRef, useState } from "react";
const date=(v:string)=>new Date(v).toLocaleString();
const parse=(s:string)=>{try{return JSON.parse(s)}catch{return {}}};

function usePages(endpoint:string) {
  const [rows,setRows]=useState<any[]>([]),[offset,setOffset]=useState(0),[total,setTotal]=useState(0),[next,setNext]=useState<number|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  const loaded=useRef("");
  useEffect(()=>{setOffset(0);setRows([])},[endpoint]);
  useEffect(()=>{
    let active=true;
    if(loaded.current!==endpoint+offset)setLoading(true);setError("");
    fetch(`${endpoint}&offset=${offset}`,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error || "Could not load records");if(active){loaded.current=endpoint+offset;setRows(d.rows);setTotal(d.total);setNext(d.nextOffset)}}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));
    return()=>{active=false};
  },[endpoint,offset,revision]);
  return {rows,offset,total,next,loading,error,back:()=>setOffset(Math.max(0,offset-25)),forward:()=>next!==null&&setOffset(next),reload:()=>setRevision(v=>v+1)};
}
function Pages({data,label}:any){return <div className="record-pagination"><span>{data.total?`${data.offset+1}–${Math.min(data.offset+data.rows.length,data.total)} of ${data.total} ${label}`:`No ${label}`}</span><div><button className="ghost" disabled={data.loading||data.offset===0} onClick={data.back}>Newer</button><button className="ghost" disabled={data.loading||data.next===null} onClick={data.forward}>Older</button></div></div>}

export function ResearchHistory({projectId,onResume,busy,onRefresh,onPause}:any) {
  const [kind,setKind]=useState("sessions");
  const data=usePages(`/api/history?projectId=${encodeURIComponent(projectId)}&kind=${kind}`);
  useEffect(()=>{if(!busy)data.reload()},[busy]);
  return <section className="panel research-records"><div className="records-heading"><div><p className="eyebrow">EVERY STEP, REMEMBERED</p><h2>Research history</h2><p>Browse every saved session, decision, and provider call.</p></div><button className="ghost" onClick={()=>{data.reload();onRefresh()}}>Refresh</button></div>
    <div className="record-tabs" role="tablist" aria-label="History type">{[["sessions","Research sessions"],["activity","Activity log"],["calls","Provider calls"]].map(([id,label])=><button key={id} role="tab" aria-selected={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div>
    <Pages data={data} label="records"/>
    {data.error&&<p role="alert">{data.error} <button onClick={data.reload}>Retry</button></p>}
    {data.loading?<p role="status">Loading history…</p>:data.rows.map(r=>kind==="sessions"?<article className="record-item" key={r.id}><div className="record-meta"><span>{date(r.started_at)}</span><span className={`status-tag ${r.status}`}>{r.status}</span></div><h3>{r.topic}</h3><p>{r.executive_summary || "Research is saved at the checkpoint below."}</p><p className="record-muted">{r.provider} · Saved stage: {String(parse(r.checkpoint_json).stage || "Not yet completed").replaceAll("_"," ")}</p>{r.parent_session_id&&<small>Continues session {r.parent_session_id}</small>}{r.error&&<p role="alert">{r.error}</p>}<details><summary>Instructions & next steps</summary><p>{r.instructions}</p><ul>{(parse(r.checkpoint_json).nextTasks||[]).map((t:string,i:number)=><li key={i}>{t}</li>)}</ul><p>{parse(r.checkpoint_json).findingsCreated ?? 0} findings saved · {parse(r.checkpoint_json).sourcesCaptured ?? 0} sources captured · {parse(r.checkpoint_json).duplicatesSkipped ?? 0} duplicates avoided.</p></details><div className="record-actions">{["running","queued"].includes(r.status)?<button className="ghost" onClick={async()=>{await onPause(r.id);data.reload()}}>Pause after current stage</button>:<button className="primary compact" disabled={busy} onClick={()=>onResume(r)}>{r.status==="completed"?"Continue research":"Resume saved stage"} →</button>}</div></article>:kind==="activity"?<article className="record-item" key={r.id}><div className="record-meta"><span>{date(r.created_at)}</span><span>{r.severity}</span></div><h3>{r.action.replaceAll("."," ").replaceAll("_"," ")}</h3><p>{r.detail}</p><small>Session: {r.session_id || "Workspace"}</small></article>:<article className="record-item" key={r.id}><div className="record-meta"><span>{date(r.created_at)}</span><span>{r.success?"Completed":"Failed"}</span></div><h3>{r.provider_name} · {r.stage}</h3><p>{r.model} · {r.latency_ms} ms · Tokens {r.input_tokens ?? "—"} → {r.output_tokens ?? "—"}</p>{r.error&&<p role="alert">{r.error}</p>}</article>)}
    {!data.loading&&!data.rows.length&&!data.error&&<div className="empty">Your research history will appear here.</div>}
    <p className="record-muted">Pause saves the current provider response before stopping. Recovery reuses completed stages; a request interrupted before its response was saved must be retried.</p>
  </section>
}

export function NotificationInbox({projectId,onNavigate,onRefresh}:any) {
  const [unread,setUnread]=useState(false),[actionError,setActionError]=useState("");
  const data=usePages(`/api/notifications?projectId=${encodeURIComponent(projectId)}&unread=${unread}`);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible")data.reload()},5000);return()=>clearInterval(timer)},[projectId,unread]);
  const acknowledge=async(id:string)=>{try{const r=await fetch("/api/notifications",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id})});if(!r.ok)throw new Error("Could not acknowledge notification");data.reload();await onRefresh()}catch(e){setActionError(String(e))}};
  return <section className="panel research-records"><div className="records-heading"><div><p className="eyebrow">NOTHING LOST IN THE BACKGROUND</p><h2>Your notifications</h2><p>Limitations, failures, approval requests, and completed work stay here after you leave.</p></div><label><input type="checkbox" checked={unread} onChange={e=>setUnread(e.target.checked)}/> Unread only</label></div>{(data.error||actionError)&&<p role="alert">{data.error||actionError}</p>}{data.loading?<p role="status">Loading notifications…</p>:data.rows.map(r=><article className={`record-item ${r.read_at?"":"unread-record"}`} key={r.id}><div className="record-meta"><span>{date(r.created_at)}</span><span>{r.read_at?"Read":"Unread"} · {r.severity}</span></div><h3>{r.title}</h3><p>{r.detail}</p><div className="record-actions"><button className="ghost" onClick={()=>onNavigate(r.destination)}>View {r.destination} →</button>{!r.read_at&&<button className="ghost" onClick={()=>acknowledge(r.id)}>Mark as read</button>}</div></article>)}{!data.loading&&!data.rows.length&&!data.error&&<div className="empty">You’re all caught up.</div>}<Pages data={data} label="notifications"/></section>
}
