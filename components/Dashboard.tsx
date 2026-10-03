"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ResearchHistory, NotificationInbox } from "./ResearchRecords";
import ProviderModelSelect from "./ProviderModelSelect";

type Tab = "overview" | "research" | "library" | "search" | "history" | "issues" | "approvals" | "settings" | "notifications";
type State = any;

const nav: Array<[Tab, string, string]> = [
  ["overview", "Overview", "grid"],
  ["research", "Research", "spark"],
  ["library", "Knowledge library", "folder"],
  ["approvals", "Approvals", "check"],
  ["search", "Search memory", "search"],
  ["history", "History & resume", "history"],
  ["issues", "Issues & limits", "alert"],
  ["notifications", "Notifications", "alert"],
  ["settings", "Providers & settings", "settings"],
];

export default function Dashboard() {
  const goTo = (target: Tab) => {
    if (target === tab) return;
    {
      setTab(target);
      const url = new URL(window.location.href);
      url.searchParams.set("view", target);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [entryTopic, setEntryTopic] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (nav.some(([id]) => id === view)) setTab(view as Tab);
    setEntryTopic((params.get("topic") || "").slice(0, 2000));
  }, []);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [operation, setOperation] = useState("Research in progress");
  useEffect(() => { window.scrollTo({top: 0}); }, [tab]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal,setSearchTotal] = useState(0);
  const [searchNext,setSearchNext] = useState<number|null>(null);
  const [searchQuery,setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const searchVersion = useRef(0);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(value => !value); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    const data = await res.json();
    if(res.status===401){window.location.assign("/auth");return;}
    if (!res.ok) throw new Error(data.error || "Unable to load workspace");
    setLoadError("");
    setState(data);
    setProjectId((current) => current || data.projects?.[0]?.id || "");
  }, []);

  useEffect(() => { refresh().catch(e => setLoadError(e.message)); }, [refresh]);

  useEffect(() => {
    const timer=setInterval(()=>{if(document.visibilityState === "visible") refresh().catch(()=>{});},5000);
    return()=>clearInterval(timer);
  },[refresh]);
  const project = useMemo(() => state?.projects?.find((p: any) => p.id === projectId), [state, projectId]);
  const projectFindings = useMemo(() => state?.findings?.filter((x: any) => x.project_id === projectId) ?? [], [state, projectId]);
  const projectFolders = useMemo(() => state?.folders?.filter((x: any) => x.project_id === projectId) ?? [], [state, projectId]);
  const projectSessions = useMemo(() => state?.sessions?.filter((x: any) => x.project_id === projectId) ?? [], [state, projectId]);
  const projectResources = useMemo(() => state?.resources?.filter((x: any) => x.project_id === projectId) ?? [], [state, projectId]);
  const projectClarifications = useMemo(() => state?.clarifications?.filter((x: any) => x.project_id === projectId) ?? [], [state, projectId]);
  const projectActivity = useMemo(() => state?.activity?.filter((x: any) => !x.project_id || x.project_id === projectId) ?? [], [state, projectId]);
  const projectLimitations = useMemo(() => state?.limitations?.filter((x: any) => !x.project_id || x.project_id === projectId) ?? [], [state, projectId]);
  const projectProviderCalls = useMemo(() => state?.providerCalls?.filter((x: any) => !x.project_id || x.project_id === projectId) ?? [], [state, projectId]);

  const unreadCount = (state?.unread || []).filter((n:any)=>!n.project_id || n.project_id===projectId).reduce((sum:number,n:any)=>sum+Number(n.count),0);
  const activeSession = projectSessions.find((s:any)=>["running","queued"].includes(s.status));
  async function pauseSession(id:string) {
    try { const r=await fetch(`/api/research/${id}/pause`,{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error);setToast("Pause requested. The current stage will be saved before stopping.");await refresh(); }
    catch(e){setToast(e instanceof Error?e.message:"Could not pause research")}
  }

  async function runResearch(topic: string, instructions: string, providerId: string) {
    if (!projectId) return;
    setOperation("Research in progress"); setBusy(true); setToast("");
    try {
      const res = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, topic, instructions, providerId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      await refresh();
      setToast(data.status === "queued" ? "Research queued. You can keep working or close this tab; Atlas will save your progress." : data.status === "paused" ? "Research paused safely. Resume from History." : data.provider === "demo" ? "Demo run completed. Add any AI provider in System & Providers for live research." : `Research completed with ${data.provider} · ${data.model}.`);
      setTab("overview");
    } catch (e) { setToast(e instanceof Error ? e.message : "Research failed"); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }

  async function resumeSession(session: any) {
    setOperation("Resuming saved research"); setBusy(true); setToast("");
    try {
      const res = await fetch(`/api/research/${session.id}/resume`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resume failed");
      await refresh();
      setToast(data.status === "queued" ? "Research queued. You can keep working or close this tab; Atlas will save your progress." : data.status === "paused" ? "Research paused safely." : `Research continued with ${data.provider} · ${data.model}.`);
    } catch (e) { setToast(e instanceof Error ? e.message : "Resume failed"); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }

  async function resolveClarification(id: string, path: string) {
    setOperation("Saving your filing decision"); setBusy(true);
    try {
      const res = await fetch(`/api/clarifications/${id}/resolve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderPath: path }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save decision");
      await refresh();
      setToast(`Filed into ${data.folderPath}. The human decision was saved for future organization.`);
    } catch (e) { setToast(e instanceof Error ? e.message : "Could not save decision"); }
    finally { setBusy(false); }
  }

  async function search(q: string, append = false) {
    const version = ++searchVersion.current;
    if(!append){setSearchResults([]);setSearchNext(null);setSearchTotal(0);setSearchQuery(q);}
    if (!q.trim()) { setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&offset=${append ? searchNext || 0 : 0}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search unavailable");
      if (version === searchVersion.current) {setSearchResults(old=>append?[...old,...data.results]:data.results || []);setSearchTotal(data.total || 0);setSearchNext(data.nextOffset);}
    } catch (e) { if (version === searchVersion.current) setToast(e instanceof Error ? e.message : "Search failed. Please retry."); }
    finally { if (version === searchVersion.current) setSearching(false); }
  }

  if (!state) return loadError ? <div className="loading-shell"><div className="loading-logo">A</div><h2>Workspace unavailable</h2><p role="alert">{loadError}</p><button className="primary" onClick={() => refresh().catch(e => setLoadError(e.message))}>Try again</button></div> : <LoadingShell />;
  const enabledProviders = state.providers?.filter((p: any) => p.enabled) ?? [];

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Atlas home"><div className="brand-mark">A</div><div><strong>ATLAS</strong><span>Universal Research OS</span></div></a>
      <button className="sidebar-search" onClick={() => setCommandOpen(true)}><Icon name="search"/> Search or jump to… <kbd>⌘ K</kbd></button><div className="project-label">WORKSPACE</div>
      <select aria-label="Current workspace" className="project-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>{state.projects.map((p: any) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
      <div className="project-label nav-label">RESEARCH PLATFORM</div><nav aria-label="Main navigation">{nav.map(([id, label, icon]) => <button key={id} aria-current={tab === id ? "page" : undefined} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => goTo(id)}><Icon name={icon}/><span>{label}</span>{id === "notifications" && unreadCount>0 && <b className="nav-count">{unreadCount}</b>}{id === "approvals" && projectClarifications.length > 0 && <b className="nav-count">{projectClarifications.length}</b>}{id === "issues" && projectLimitations.filter((x: any) => x.status === "open").length > 0 && <b className="nav-count">{projectLimitations.filter((x: any) => x.status === "open").length}</b>}</button>)}</nav>
      <div className="sidebar-foot">
        <div className="connection-row"><span className={enabledProviders.length ? "status-dot live" : "status-dot demo"}></span><div><b>{enabledProviders.length ? `${enabledProviders.length} AI provider${enabledProviders.length === 1 ? "" : "s"}` : "Demo mode"}</b><small>{enabledProviders.length ? `${state.config.activeProviderName} · ${state.config.activeModel}` : "No live provider configured"}</small></div></div>
        <button className="new-project-link" onClick={() => goTo("settings")}>+ Connect provider / workspace</button>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div><p className="eyebrow">{project?.name ?? "Research workspace"}</p><h1>{titleFor(tab)}</h1></div><div className="top-actions"><button className="search-trigger" aria-label="Open command palette" onClick={() => setCommandOpen(true)}><Icon name="search"/><kbd>⌘ K</kbd></button><div className="system-pill"><span className="pulse"></span>{enabledProviders.length ? "Providers configured" : "Demo workspace"}</div><button className="primary compact" onClick={() => goTo("research")}><Icon name="spark"/> New research</button></div></header>
      {toast && <div className="toast" role="status"><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></div>}
      {busy && <div className="busybar" role="status"><span></span><b>{operation}…</b><small>Your workspace will update when the operation completes.</small></div>}

      <section className="content">
        {unreadCount>0 && tab!=="notifications" && <div className="attention-banner" role="status"><span><b>{unreadCount} unread update{unreadCount===1?"":"s"}</b> · Research results, limitations, and decisions needing attention.</span><button onClick={()=>goTo("notifications")}>Open inbox →</button></div>}
        {activeSession && <div className="attention-banner"><span>Research is in progress: <b>{activeSession.topic}</b></span><button onClick={()=>pauseSession(activeSession.id)}>Pause after this stage</button></div>}
        {tab === "overview" && <Overview state={state} project={project} findings={projectFindings} resources={projectResources} sessions={projectSessions} clarifications={projectClarifications} limitations={projectLimitations} onResearch={() => goTo("research")} onNavigate={goTo} onPrompt={(topic: string) => { setEntryTopic(topic); goTo("research"); }} onResolve={resolveClarification} onResume={resumeSession} busy={busy}/>} 
        <div hidden={tab !== "research"}><ResearchPanel entryTopic={entryTopic} project={project} state={state} busy={busy || Boolean(activeSession)} onRun={runResearch}/></div> 
        {tab === "library" && <Library key={projectId} folders={projectFolders} findings={projectFindings} resources={projectResources}/>} 
        {tab === "search" && <SearchPanel results={searchResults} searching={searching} onSearch={search} total={searchTotal} hasMore={searchNext!==null} onMore={()=>search(searchQuery,true)}/>} 
        {tab === "history" && <ResearchHistory key={projectId} projectId={projectId} onResume={resumeSession} busy={busy} onRefresh={refresh} onPause={pauseSession}/>} 
        {tab === "approvals" && <div className="panel"><PanelHead title="Your judgment. Better memory." sub="Review uncertain classifications. Edit the folder path before approving; Atlas remembers your decision." badge={`${projectClarifications.length} pending`}/>{projectClarifications.map((item: any) => <ClarificationCard key={item.id} item={item} findings={projectFindings} onResolve={resolveClarification} busy={busy}/>)}{!projectClarifications.length && <Empty icon="check" title="You’re all caught up" text="Findings and resources that need a human decision will appear here."/>}</div>}
        {tab === "issues" && <Issues limitations={projectLimitations}/>} 
        {tab === "notifications" && <NotificationInbox key={projectId} projectId={projectId} onNavigate={goTo} onRefresh={refresh}/>}
        {tab === "settings" && <SystemPanel state={state} project={project} refresh={refresh} setProjectId={setProjectId} setToast={setToast}/>} 
      </section>
    </main>
    {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onNavigate={(target: Tab) => { setCommandOpen(false); goTo(target); }} />}
  </div>;
}

function Overview({ state, project, findings, resources, sessions, clarifications, onResearch, onNavigate, onPrompt, onResume, busy }: any) {
  const filed = findings.filter((x: any) => x.status === "filed").length;
  const enabled = state.providers.filter((x: any) => x.enabled);
  const latest = sessions[0];
  const metrics=state.metrics?.find((m:any)=>m.project_id===project?.id);
  const topics = ["Map the competitive landscape", "Explore an emerging technology", "Compare approaches and evidence"];
  return <div className="editorial-overview">
    <div className="desk-introduction"><div><p className="eyebrow">YOUR RESEARCH DESK</p><h2>A little curiosity.<br/><em>A clearer perspective.</em></h2><p>Make room for your next good question.</p></div><div className="desk-art" aria-hidden="true"><img src="/visuals/intelligence-core.webp" alt="" width="1672" height="941"/><span>ATLAS / CONNECTED THINKING</span></div></div>
    <button className="desk-prompt" onClick={onResearch}><span className="prompt-star"><Icon name="spark"/></span><span>What would you like to understand?<small>Start a research brief with your own AI</small></span><span className="prompt-arrow">↗</span></button>
    <div className="desk-suggestions"><span>A PLACE TO START</span>{topics.map(t => <button key={t} onClick={() => onPrompt(t)}>{t}<span>↗</span></button>)}</div>
    <div className="desk-measures"><button onClick={() => onNavigate("library")}><strong>{findings.length}</strong><span>findings<small>{filed} in your library</small></span></button><button onClick={() => onNavigate("library")}><strong>{resources.length}</strong><span>sources<small>Captured provenance</small></span></button><button onClick={() => onNavigate("approvals")}><strong>{clarifications.length}</strong><span>to review<small>Your judgment matters</small></span></button><button onClick={() => onNavigate("settings")}><strong>{enabled.length}</strong><span>providers<small>{enabled.length ? state.config.activeProviderName : "Demo mode"}</small></span></button></div>
    <div className="desk-columns"><section className="desk-journal"><div className="desk-section-heading"><div><p className="eyebrow">PICK UP THE THREAD</p><h3>On your desk</h3></div><button onClick={() => onNavigate("history")}>All research ↗</button></div>
      {latest ? <article className="featured-session"><span className="journal-date">{fmtDate(latest.updated_at)} <span> / {latest.provider === "demo" ? "DEMO" : latest.provider}</span></span><h4>{latest.topic}</h4><p>{latest.executive_summary || "Your research is saved here. Continue from its latest checkpoint when you’re ready."}</p><div><span className={`status-tag ${latest.status}`}>{latest.status}</span><button className="journal-resume" disabled={busy || ["running","queued"].includes(latest.status)} onClick={() => onResume(latest)}>Continue research <span>→</span></button></div></article> : <Empty icon="spark" title="Your first discovery belongs here" text="Start with a question. Atlas will keep the evidence, findings, and next steps together."/>}
      {sessions.slice(1,4).map((session:any) => <div className="journal-row" key={session.id}><span><Icon name="doc"/></span><div><b>{session.topic}</b><small>{fmtDate(session.updated_at)} · {session.provider}</small></div><button className="ghost" disabled={busy || ["running","queued"].includes(session.status)} onClick={() => onResume(session)}>Resume ↗</button></div>)}
    </section><aside className="desk-margin"><div className="desk-section-heading"><div><p className="eyebrow">A HUMAN TOUCH</p><h3>{clarifications.length ? "A moment of your judgment" : "Everything in its place"}</h3></div></div>
      <div className="review-note"><div className="note-symbol"><Icon name={clarifications.length ? "folder" : "check"}/></div><p>{clarifications.length ? `${clarifications.length} item${clarifications.length === 1 ? " needs" : "s need"} a home. Take a look at the suggested folder and make the final call.` : "No pending filing decisions. Your next research run can build on what’s already here."}</p><button onClick={() => onNavigate("approvals")}>{clarifications.length ? "Review decisions" : "Open approval inbox"} <span>↗</span></button></div>
      <div className="desk-connection"><span className="eyebrow">YOUR RESEARCH PARTNER</span><b>{enabled.length ? state.config.activeProviderName : "Ready when you are"}</b><p>{enabled.length ? "Your connected providers are available for the next research run." : "Explore with sample findings, or connect an AI provider for live research."}</p><button onClick={() => onNavigate("settings")}>{enabled.length ? "Manage providers" : "Connect your AI"} →</button></div>
    </aside></div>
    <details className="capability-summary"><summary>What Atlas can do for this workspace</summary><div className="capability-lines"><p><b>Research & recall</b> — Investigates your instructions and retrieves related saved knowledge before starting.</p><p><b>Organize & ask</b> — Classifies findings and sources. Uncertain destinations wait for your decision.</p><p><b>Stay accountable</b> — Keeps notifications, provider attempts, and a complete browsable history.</p><p><b>Pause & continue</b> — Saves completed stages and preserves earlier sessions when you continue.</p><p><b>Work completed</b> — {metrics?.completed || 0} completed sessions · {metrics?.continuations || 0} continuations · {filed} filed findings · {resources.filter((r:any)=>r.status==="filed").length} filed resources.</p><p><b>Available now</b> — {enabled.length} connected providers; {enabled.filter((p:any)=>p.capabilities.webSearch && p.webSearchEnabled).length} with native web search enabled. {enabled.length?"Provider and model access must pass a connection test.":"Demo mode uses sample findings."}</p></div></details>
    <div className="desk-footer"><span><Icon name="history"/> Your questions, sources, and decisions stay together.</span><span>{project?.name || "Atlas workspace"}</span></div>
  </div>;
}

function ResearchPanel({ project, state, busy, onRun, entryTopic }: any) {
  const [topic, setTopic] = useState(entryTopic || project?.topic || "");
  const [instructions, setInstructions] = useState(project?.instructions || "");
  const [providerId, setProviderId] = useState(state.config.activeProviderId || "auto");
  const initialProject = useRef(project?.id);
  useEffect(() => { setTopic(initialProject.current === project?.id && entryTopic ? entryTopic : project?.topic || ""); setInstructions(project?.instructions || ""); }, [project?.id, entryTopic]);
  useEffect(() => { setProviderId(state.config.activeProviderId || "auto"); }, [state.config.activeProviderId]);
  const provider = state.providers.find((p: any) => p.id === providerId);
  const submit = (e: FormEvent) => { e.preventDefault(); if (topic.trim()) onRun(topic, instructions, providerId); };
  return <div className="research-layout">
    <form className="panel research-command" onSubmit={submit}>
      <div className="command-mark"><Icon name="spark"/></div><p className="eyebrow">YOUR RESEARCH BRIEF</p><h2>What should Atlas investigate?</h2><p className="lead">Begin with a clear question. Add the scope and source preferences that matter to you; Atlas will keep the research organized.</p>
      <label>AI provider<select value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="auto">⚡ Auto Router — active provider + failover</option>{state.providers.filter((p: any) => p.enabled).map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.model}{p.capabilities.webSearch ? " · web" : " · model knowledge"}</option>)}</select></label>
      <div className="provider-inline"><span className={state.providers.some((p: any) => p.enabled) ? "status-dot live" : "status-dot demo"}></span><div><b>{!state.providers.some((p: any) => p.enabled) ? "Demo mode · no live provider" : providerId === "auto" ? "Automatic routing" : provider?.name || "Demo mode"}</b><small>{!state.providers.some((p: any) => p.enabled) ? "This run demonstrates the workflow with sample findings. Add a provider for live research." : providerId === "auto" ? "Uses active provider first, then enabled fallbacks" : provider ? `${provider.model} · ${provider.capabilities.webSearch && provider.webSearchEnabled ? "native web search available" : "no standardized live web search"}` : "No provider configured"}</small></div></div>
      <label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Enterprise adoption of AI agents in financial services"/></label>
      <label>Research instructions<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Prioritize primary sources from the last 12 months. Compare vendors, adoption evidence, technical architecture, risks, and unanswered questions…" rows={8}/></label>
      <div className="form-hints"><span><Icon name="search"/> Source verification</span><span><Icon name="folder"/> Automatic organization</span><span><Icon name="check"/> Approval on uncertainty</span><span><Icon name="history"/> Resumable checkpoint</span></div>
      <button className="primary run" disabled={busy || !topic.trim()}>{busy ? "Researching…" : "Run research"}<span>→</span></button>
    </form>
    <div className="research-side">
      <div className="panel mini"><p className="eyebrow">THE FLOW</p><Flow n="01" title="Route" text="Use your chosen provider or let Auto Router select and fail over."/><Flow n="02" title="Research" text="Native search is used where the provider supports it; otherwise Atlas records the limitation."/><Flow n="03" title="Verify" text="Only source URLs actually returned by the provider are allowed into findings."/><Flow n="04" title="Synthesize & classify" text="Atomic findings receive folder recommendations and confidence scores."/><Flow n="05" title="Remember" text="Folders, sources, decisions, provider telemetry, and checkpoint state are persisted."/></div>
      <div className="panel policy-card"><p className="eyebrow">CONTROL POLICY</p><div className="policy-line"><b>High confidence</b><span>Auto-file</span></div><div className="policy-line"><b>Low confidence</b><span>Ask first</span></div><div className="policy-line"><b>Provider failure</b><span>Fail over / log</span></div><div className="policy-line"><b>Invalid AI JSON</b><span>Repair once</span></div><div className="policy-line"><b>Unverified URL</b><span>Drop it</span></div></div>
    </div>
  </div>;
}

function Library({ folders, findings, resources }: any) {
  const [selected, setSelected] = useState("All");
  const [filter, setFilter] = useState("");
  const visibleResources=resources.filter((r:any)=>(selected==="All" || r.folder_path===selected || r.folder_path?.startsWith(selected+"/")) && `${r.title} ${r.url} ${r.description}`.toLowerCase().includes(filter.toLowerCase()));
  const visible = findings.filter((f: any) => (selected === "All" || f.folder_path === selected || f.folder_path?.startsWith(selected + "/")) && `${f.title} ${f.summary} ${f.tags_json}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="library-layout"><div className="panel folder-panel"><PanelHead title="Your library" sub="A home for every idea."/><button className={selected === "All" ? "folder-row selected" : "folder-row"} onClick={() => setSelected("All")}><Icon name="stack"/><span>All research</span><b>{findings.length + resources.length}</b></button>{folders.map((f: any) => <button key={f.id} className={selected === f.path ? "folder-row selected" : "folder-row"} style={{paddingLeft: 18 + (f.path.split("/").length - 1) * 18}} onClick={() => setSelected(f.path)}><Icon name="folder"/><span>{f.name}</span><b>{findings.filter((x: any) => x.folder_path === f.path).length + resources.filter((x:any)=>x.folder_path===f.path).length}</b></button>)}</div>
    <div className="panel library-content"><PanelHead title={selected} sub={`${visible.length} findings · ${visibleResources.length} captured resources`}/><input className="library-filter" aria-label="Filter findings and resources" placeholder="Filter findings and resources…" value={filter} onChange={e => setFilter(e.target.value)}/><div className="finding-grid reading-list">{visible.map((f: any) => <FindingCard key={f.id} f={f}/>)}</div>{!visible.length && !visibleResources.length && <Empty icon="folder" title="Nothing filed here yet" text="Run research or choose another folder."/>}{visibleResources.length > 0 && <div className="resource-section"><p className="eyebrow">CAPTURED SOURCE LIBRARY</p>{visibleResources.map((r: any) => <a className="resource-row" href={r.url} target="_blank" rel="noreferrer" key={r.id}><Icon name="link"/><div><b>{r.title}</b><span>{r.url}</span><small>{r.folder_path || "Awaiting folder approval"} · {r.status || "filed"}</small></div></a>)}</div>}</div></div>;
}

function SearchPanel({ results, searching, onSearch, total, hasMore, onMore }: any) {
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => onSearch(q), 250); return () => clearTimeout(t); }, [q]);
  return <div className="panel search-panel"><div className="search-hero"><p className="eyebrow">YOUR COLLECTIVE MEMORY</p><h2>It’s here somewhere. Let’s find it.</h2><p>Search findings, full content, tags, source URLs, and folder paths across the entire research memory.</p><div className="big-search"><Icon name="search"/><input aria-label="Search all research" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search research, sources, topics, tags, folders…"/><kbd>⌘ K</kbd></div></div><div className="search-results">{searching && <div className="searching">Searching FTS5 knowledge index…</div>}{!searching && q && <p className="result-count">{total} result{total === 1 ? "" : "s"} · {results.length} shown</p>}{results.map((r: any) => <div className="result-row" key={`${r.entity_type}-${r.entity_id}`}><div className="result-type"><Icon name={r.entity_type === "resource" ? "link" : "doc"}/></div><div><div className="result-meta"><span>{r.entity_type}</span><span>{r.path}</span></div><h3>{r.title}</h3><p>{String(r.body).slice(0, 300)}{String(r.body).length > 300 ? "…" : ""}</p><details><summary>Read saved record</summary><p style={{whiteSpace:"pre-wrap"}}>{r.body}</p>{r.url&&<a href={r.url} target="_blank" rel="noreferrer">Open source ↗</a>}</details></div></div>)}{hasMore&&<button className="ghost" disabled={searching} onClick={onMore}>Load more results</button>}{!searching && q && !results.length && <Empty icon="search" title="No matching knowledge yet" text="Try a broader term, a source domain, or another topic."/>}{!q && <Empty icon="search" title="Search the entire research memory" text="Try a topic, source domain, finding, technology, risk, tag, or folder name."/>}</div></div>;
}

function Issues({ limitations }: any) {
  return <div className="panel"><PanelHead title="Limitations & access issues" sub="No confident pretending: provider errors, missing web search, access problems, and research constraints are surfaced explicitly." badge={`${limitations.filter((x: any) => x.status === "open").length} open`}/>{limitations.map((x: any) => <div className="issue-row" key={x.id}><div className="issue-icon"><Icon name="alert"/></div><div><div className="issue-head"><b>{x.title}</b><span>{x.code}</span></div><p>{x.detail}</p><small>{fmtDate(x.created_at)} · {x.status}</small></div></div>)}{!limitations.length && <Empty icon="check" title="No limitations recorded" text="Access problems, missing information, API errors, and research constraints will appear here automatically."/>}</div>;
}

function SystemPanel({ state, project, refresh, setProjectId, setToast }: any) {
  const [name, setName] = useState(""); const [topic, setTopic] = useState(""); const [instructions, setInstructions] = useState(""); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState("");
  async function create(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/projects", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,topic,instructions})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create workspace");
      await refresh(); setProjectId(data.id); setName(""); setTopic(""); setInstructions(""); setMsg("Workspace created.");
    } catch(e) { setMsg(e instanceof Error ? e.message : "Could not create workspace. Please retry."); }
    finally { setSaving(false); }
  }

  return <div className="system-stack">
    <ProviderVault state={state} refresh={refresh} setToast={setToast}/>
    <div className="settings-grid"><div className="panel"><PanelHead title="Runtime control plane" sub="Private research with encrypted credentials and durable cloud storage."/><div className="config-list"><Config label="Enabled providers" value={String(state.config.liveProviderCount)} ok={state.config.liveProviderCount > 0}/><Config label="Routing mode" value={state.config.activeProviderId === "auto" ? "Auto Router + failover" : state.config.activeProviderName}/><Config label="Active model" value={state.config.activeModel}/><Config label="Auto-file threshold" value={`${Math.round(state.config.autoFileConfidence*100)}%`}/><Config label="Credential vault" value="AES-256-GCM encrypted" ok/><Config label="Persistence" value="Supabase PostgreSQL" ok/><Config label="Folder mirror" value="Private cloud documents" ok/><Config label="Current workspace" value={project?.name || "None"}/></div><div className="code-note"><b>Security model</b><p>Each account has its own encrypted key vault. Keys are never returned to the browser or placed in research prompts. Database ownership rules keep accounts separate.</p></div></div>
      <form className="panel" onSubmit={create}><PanelHead title="Create workspace" sub="Separate topics into independent long-term research memories."/><label>Workspace name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. FinTech Intelligence"/></label><label>Initial topic<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What will this workspace research?"/></label><label>Default instructions<textarea rows={5} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Research preferences, source standards, scope, exclusions…"/></label><button className="primary run" disabled={saving || !name.trim() || !topic.trim()}>{saving?"Creating…":"Create workspace"}</button>{msg && <p className="form-message">{msg}</p>}</form></div>
  </div>;
}

function ProviderVault({ state, refresh, setToast }: any) {
  const presets = state.providerPresets || [];
  const initial = presets[0] || { id:"gemini",label:"Google Gemini",baseUrl:"",defaultModel:"" };
  const [presetId, setPresetId] = useState(initial.id);
  const [label, setLabel] = useState(initial.label);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.defaultModel || "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || "");
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [providerBusy, setProviderBusy] = useState("");
  const preset = presets.find((x: any) => x.id === presetId) || initial;

  function changePreset(id: string) {
    const next = presets.find((item: any) => item.id === id);
    if (!next) return;
    setPresetId(id);
    setLabel(next.label || "AI provider");
    setModel(next.defaultModel || "");
    setBaseUrl(next.baseUrl || "");
    setWebSearchEnabled(Boolean(next.nativeWebSearch));
  }

  async function addProvider(e: FormEvent) {
    e.preventDefault(); setProviderBusy("save");
    try {
      const res = await fetch("/api/providers", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ presetId, name:label, apiKey, model, baseUrl, webSearchEnabled }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error || "Could not save provider");
      setApiKey(""); await refresh(); setToast(`${label} added to the encrypted provider vault. Test it before your live research run.`);
    } catch(e) { setToast(e instanceof Error ? e.message : "Could not save provider"); }
    finally { setProviderBusy(""); }
  }
  async function test(id:string) { setProviderBusy(`test:${id}`); try { const res=await fetch(`/api/providers/${encodeURIComponent(id)}/test`,{method:"POST"}); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Provider test failed"); await refresh(); setToast(`Connection verified in ${data.latencyMs} ms · ${data.model}.`); } catch(e){setToast(e instanceof Error?e.message:"Provider test failed")} finally{setProviderBusy("")} }
  async function activate(id:string) { setProviderBusy(`active:${id}`); try { const res=await fetch(`/api/providers/${encodeURIComponent(id)}/activate`,{method:"POST"}); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Could not activate provider"); await refresh(); setToast(id==="auto"?"Auto Router is active. Atlas will use the active provider and fail over when necessary.":"Provider activated for new research runs."); } catch(e){setToast(e instanceof Error?e.message:"Could not activate provider")} finally{setProviderBusy("")} }
  async function remove(id:string) { if(!confirm("Remove this provider configuration? The API key cannot be recovered after deletion.")) return; setProviderBusy(`delete:${id}`); try { const res=await fetch(`/api/providers/${encodeURIComponent(id)}`,{method:"DELETE"}); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Could not remove provider"); await refresh(); setToast("Provider removed from the vault."); } catch(e){setToast(e instanceof Error?e.message:"Could not remove provider")} finally{setProviderBusy("")} }

  return <div className="provider-vault">
    <div className="provider-vault-head"><div><p className="eyebrow">UNIVERSAL AI PROVIDER FABRIC</p><h2>Bring your own model.</h2><p>Connect multiple vendors once, then switch models without losing research memory, folders, source provenance, approvals, or history.</p></div><button disabled={Boolean(providerBusy)} className={state.config.activeProviderId === "auto" ? "route-badge active" : "route-badge"} onClick={() => activate("auto")}>⚡ Auto Router</button></div>
    <div className="provider-grid">
      <form className="panel provider-form" onSubmit={addProvider}><PanelHead title="Add AI provider" sub="API keys are encrypted server-side and are never sent back to the browser."/><label>Provider<select value={presetId} onChange={(e)=>changePreset(e.target.value)}>{presets.map((p:any)=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><div className="provider-form-row"><label>Display name<input value={label} onChange={(e)=>setLabel(e.target.value)} /></label><ProviderModelSelect key={presetId} presetId={presetId} defaultModel={preset.defaultModel || ""} value={model} onChange={setModel}/></div><label>Base URL<input value={baseUrl} onChange={(e)=>setBaseUrl(e.target.value)} placeholder="https://..."/></label><label>API key <span className="optional">{preset.keyOptional ? "optional for local endpoints" : "required"}</span><input type="password" autoComplete="off" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder={preset.keyOptional ? "Leave blank for local server" : "Paste API key — it will be encrypted"}/></label><div className="provider-description"><b>{preset.label}</b><span>{preset.description}</span></div>{preset.nativeWebSearch && <label className="checkline"><input type="checkbox" checked={webSearchEnabled} onChange={(e)=>setWebSearchEnabled(e.target.checked)}/>Allow native web search during the evidence stage</label>}<button className="primary run" disabled={providerBusy === "save" || !model.trim() || !baseUrl.trim() || (!apiKey.trim() && !preset.keyOptional)}>{providerBusy === "save" ? "Encrypting & saving…" : "Add to provider vault"}</button></form>
      <div className="panel provider-list"><PanelHead title="Connected providers" sub="Test health, choose the primary provider, or let Auto Router fail over across enabled connections." badge={`${state.providers.length} configured`}/>{state.providers.map((p:any)=><div className={`provider-card ${state.config.activeProviderId === p.id ? "active" : ""}`} key={p.id}><div className="provider-card-top"><div><div className="provider-name"><span className={`provider-health ${p.status === "error" ? "bad" : p.lastTestedAt ? "good" : "untested"}`}></span><b>{p.name}</b>{p.source === "environment" && <em>ENV</em>}</div><small>{p.kind.replace("_"," ")} · {p.model}</small></div>{state.config.activeProviderId === p.id && <span className="active-chip">PRIMARY</span>}</div><div className="provider-cap-row"><span>{p.capabilities.webSearch && p.webSearchEnabled ? "✓ native web search" : "model knowledge"}</span><span>{p.status || "untested"}</span>{p.lastTestedAt && <span>tested {fmtDate(p.lastTestedAt)}</span>}</div>{p.lastError && <p className="provider-error">{p.lastError}</p>}<div className="provider-actions"><button className="ghost" type="button" disabled={Boolean(providerBusy)} onClick={()=>test(p.id)}>{providerBusy===`test:${p.id}`?"Testing…":"Test"}</button><button className="ghost" type="button" disabled={Boolean(providerBusy)} onClick={()=>activate(p.id)}>Use as primary</button>{p.source !== "environment" && <button className="ghost danger" type="button" disabled={Boolean(providerBusy)} onClick={()=>remove(p.id)}>Remove</button>}</div></div>)}{!state.providers.length && <Empty icon="stack" title="No live AI providers yet" text="Add your Gemini key, Claude key, OpenAI key, or any supported OpenAI-compatible provider. Atlas itself remains usable in transparent demo mode."/>}</div>
    </div>
    <div className="provider-compat"><span>Native adapters</span><b>Gemini</b><b>Claude</b><b>OpenAI</b><i></i><span>OpenAI-compatible bridge</span><b>OpenRouter</b><b>Groq</b><b>Together</b><b>Mistral</b><b>xAI</b><b>DeepSeek</b><b>Ollama</b><b>LM Studio</b><b>Custom endpoint</b></div>
  </div>;
}

function ClarificationCard({ item, findings, onResolve, busy }: any) { const finding = findings.find((x: any) => x.id === item.finding_id); const [path, setPath] = useState(item.suggested_path || ""); return <div className="clarification"><div className="clarification-top"><span className="confidence">{Math.round(item.confidence*100)}% confidence</span><small>Needs approval</small></div><b>{item.entity_title || finding?.title || "Research item"}</b><small>{item.entity_type === "resource" ? "Source resource" : "Research finding"}</small><p>{item.reason}</p><div className="approval-row"><input aria-label="Destination folder path" value={path} onChange={(e)=>setPath(e.target.value)}/><button className="approve" disabled={busy || !path.trim()} onClick={()=>onResolve(item.id,path)}>Approve & remember</button></div></div> }
function FindingCard({ f }: any) { const tags = parse(f.tags_json, []); const urls = parse(f.source_urls_json, []); return <article className="finding-card"><div className="finding-head"><span className={`status-tag ${f.status}`}>{f.status === "needs_approval" ? "needs approval" : `filed · ${Math.round(f.confidence*100)}% confidence`}</span><span className="path-chip">{f.folder_path || "Unfiled"}</span></div><h3>{f.title}</h3><p>{f.summary}</p><div className="tag-row">{tags.slice(0,4).map((t:string)=><span key={t}>#{t}</span>)}</div><details className="finding-detail"><summary>Read finding & sources <span>↗</span></summary><div className="full-content">{f.content || f.summary}</div>{urls.map((url: string) => /^https?:\/\//i.test(url) ? <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a> : <span key={url}>{url}</span>)}</details><div className="finding-foot"><span>{urls.length} captured source{urls.length===1?"":"s"}</span><span>{fmtDate(f.created_at)}</span></div></article> }
function Capability({icon,title,text,status}:any){return <div className="capability"><div className="capability-icon"><Icon name={icon}/></div><div><div className="capability-title"><b>{title}</b><span>{status}</span></div><p>{text}</p></div></div>}
function Flow({n,title,text}:any){return <div className="flow"><span>{n}</span><div><b>{title}</b><p>{text}</p></div></div>}
function Config({label,value,ok}:any){return <div className="config-row"><span>{label}</span><b>{ok && <i className="config-dot"></i>}{value}</b></div>}
function Stat({label,value,sub,icon,warn}:any){return <div className={`stat-card ${warn?"warn":""}`}><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon name={icon}/></div></div><strong>{value}</strong><small>{sub}</small></div>}
function PanelHead({title,sub,badge}:any){return <div className="panel-head"><div><h3>{title}</h3><p>{sub}</p></div>{badge&&<span className="panel-badge">{badge}</span>}</div>}
function Empty({icon,title,text}:any){return <div className="empty"><div><Icon name={icon}/></div><b>{title}</b><p>{text}</p></div>}
function LoadingShell(){return <div className="loading-shell"><div className="loading-logo">A</div><h2>Loading Atlas Universal Research OS</h2><span></span></div>}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    spark:<><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z"/><path d="M19 15l.8 2.4L22 18l-2.2.6L19 21l-.8-2.4L16 18l2.2-.6L19 15z"/></>,
    folder:<path d="M3 6.5h6l2 2H21v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5z"/>,
    search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    history:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    alert:<><path d="M12 3 2.8 20h18.4L12 3z"/><path d="M12 9v5M12 17h.01"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.5-1.2.9-1.9-2.1-2.1-1.9.9-1.2-.5-.7-2h-3l-.7 2-1.2.5-1.9-.9-2.1 2.1.9 1.9-.5 1.2-2 .7v3l2 .7.5 1.2-.9 1.9 2.1 2.1 1.9-.9 1.2.5.7 2h3l.7-2 1.2-.5 1.9.9 2.1-2.1-.9-1.9.5-1.2 2-.7z"/></>,
    doc:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    link:<><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
    check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    stack:<><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.doc}</svg>;
}

function titleFor(tab: Tab){ return ({overview:"Workspace overview",research:"Start a research run",library:"Knowledge library",search:"Global search",history:"Traceability & resume",issues:"Limitations & issues",settings:"Providers & workspace",approvals:"Approval inbox",notifications:"Notifications"} as Record<Tab,string>)[tab]; }
function parse(value:any,fallback:any){try{return typeof value==="string"?JSON.parse(value):value??fallback}catch{return fallback}}
function fmtDate(value:string){try{return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}catch{return value}}
function humanize(value:string){return String(value||"").split(".").join(" · ").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase())}

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (tab: Tab) => void }) {
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const choices = nav.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="command-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-label="Search and navigation commands">
    <div className="command-input"><Icon name="search"/><input autoFocus aria-label="Find a page" value={query} onChange={e => setQuery(e.target.value)} placeholder="Where would you like to go?" onKeyDown={e => { if(e.key === "Enter" && choices[0]) { e.preventDefault(); onNavigate(choices[0][0]); } }}/><button className="ghost" onClick={onClose}>Esc</button></div>
    <p className="eyebrow">QUICK NAVIGATION</p><div className="command-options">{choices.map(([id, label, icon]) => <button key={id} onClick={() => onNavigate(id)}><Icon name={icon}/><span>{label}</span><span>↗</span></button>)}</div>
    {!choices.length && <p className="command-empty">No matching page. Search your research memory below.</p>}
    <button className="command-memory" onClick={() => onNavigate("search")}><Icon name="stack"/> Search all findings, sources & folders <span>→</span></button>
  </dialog>;
}
