"use client";
import { useNavigationTransition } from "./NavigationTransition";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


const stages = [
  { title: "Follow the evidence.", label: "Research", text: "Choose your model. Set your question. Atlas gathers evidence, preserving the source URLs returned by your provider.", tag: "01 / EVIDENCE", action: "Start a research run", view: "research" },
  { title: "Connect the signals.", label: "Synthesize", text: "Turn scattered information into focused findings. Every insight keeps its context, classification confidence, and captured sources.", tag: "02 / SYNTHESIS", action: "Explore the library", view: "library" },
  { title: "Keep your judgment.", label: "Review", text: "Confident findings are filed automatically. Uncertain classifications come to you for a decision that Atlas remembers.", tag: "03 / HUMAN CONTROL", action: "Open approvals", view: "approvals" },
  { title: "Never start from zero.", label: "Remember", text: "Search your accumulated knowledge. Resume from saved checkpoints. Carry the research forward without duplicating what you already know.", tag: "04 / CONTINUITY", action: "View saved checkpoints", view: "history" },
];

export default function AtlasExperience() {
  const router = useRouter();
  const transitionTo = useNavigationTransition();

  const root = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [question, setQuestion] = useState("");
  const mobileMenu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (menu) mobileMenu.current?.showModal();
    else mobileMenu.current?.close();
  }, [menu]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } });
    }, { threshold: 0.12 });
    el.querySelectorAll("[data-reveal]").forEach(target => observer.observe(target));
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!story.current || !hero.current) return;
      const box = story.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -box.top / Math.max(1, box.height - innerHeight)));
      const compact = innerWidth <= 760 || reduced || paused;
      if (!compact) setStage(Math.min(3, Math.floor(progress * 4)));
      el.style.setProperty("--journey", String(compact ? 0 : progress));
      const hp = Math.max(0, Math.min(1, -hero.current.getBoundingClientRect().top / innerHeight));
      el.style.setProperty("--hero-scroll", String(reduced || paused ? 0 : hp));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [reduced, paused]);

  function chooseStage(index: number) {
    setStage(index);
    if (innerWidth > 760 && !reduced && !paused && story.current) {
      const top = window.scrollY + story.current.getBoundingClientRect().top;
      const span = story.current.offsetHeight - innerHeight;
      window.scrollTo({top:top + ((index + .15) / 4) * span, behavior:"instant"});
    }
  }

  return <div ref={root} className={`atlas-experience ${paused || reduced ? "motion-paused" : ""}`}>
    <a className="skip-link" href="/workspace">Skip to research workspace</a>
    <header className="experience-nav">
      <Link className="experience-brand" href="/" aria-label="Atlas home"><AtlasMark/><span>ATLAS<small>RESEARCH OS</small></span></Link>
      <nav aria-label="Experience navigation" className="experience-links"><a href="#intelligence">The idea</a><a href="#workflow">How it works</a><a href="#models">Your models</a><Link className="nav-enter" href="/workspace">Open workspace <Arrow/></Link></nav>
      <button className="mobile-menu-toggle" onClick={() => setMenu(true)} aria-label="Open navigation">Menu <span>＋</span></button>
    </header>
    <dialog ref={mobileMenu} className="experience-menu" onCancel={() => setMenu(false)} aria-label="Atlas navigation"><div><b>ATLAS</b><button onClick={() => setMenu(false)} aria-label="Close navigation">✕</button></div><a href="#intelligence" onClick={() => setMenu(false)}>The idea <Arrow/></a><a href="#workflow" onClick={() => setMenu(false)}>How it works <Arrow/></a><a href="#models" onClick={() => setMenu(false)}>Your models <Arrow/></a><Link href="/workspace">Open workspace <Arrow/></Link></dialog>
    <main>
      <section ref={hero} className="experience-hero" aria-labelledby="experience-title">
        <div className="hero-art"><img src="/visuals/intelligence-core.webp" alt="Flowing titanium and glass ribbons forming an interconnected intelligence core" fetchPriority="high" width="1672" height="941"/><div className="hero-art-light"/></div>
        <div className="hero-grain" aria-hidden="true"/>
        <div className="hero-coordinate mono"><span className="signal-dot"/> INDEPENDENT MODELS. CONNECTED KNOWLEDGE.</div>
        <div className="hero-side-note"><span className="mono">A NEW WAY TO KNOW</span><p>Your questions.<br/>Any AI.<br/><span>One lasting memory.</span></p></div>
        <div className="experience-hero-copy"><div className="headline-mask"><h1 id="experience-title">Intelligence,<br/><span>without the noise.</span></h1></div><div className="hero-lower"><p>A research workspace that turns open questions<br className="desktop-break"/> into connected, traceable knowledge.</p><Link className="experience-button mint" href="/workspace?view=research">Start researching <Arrow/></Link></div></div>
        <div className="hero-bottom"><a href="#intelligence" className="mono scroll-cue"><span>↓</span> SCROLL TO EXPLORE</a><span className="mono hero-edition">ATLAS / UNIVERSAL RESEARCH SYSTEM</span><button className="motion-control" aria-pressed={paused || reduced} onClick={() => setPaused(!paused)} disabled={reduced}>{reduced ? "Reduced motion" : paused ? "Enable motion" : "Pause motion"}<span>{paused || reduced ? "▷" : "Ⅱ"}</span></button></div>
      </section>

      <section id="intelligence" className="intelligence-section">
        <div className="section-topline"><span className="mono">01 — THE ATLAS PRINCIPLE</span><span className="mono">LESS FRICTION. MORE UNDERSTANDING.</span></div>
        <div className="statement" data-reveal><span className="statement-cross left" aria-hidden="true">+</span><h2>Many models.<br/>One <span>continuous mind.</span></h2><span className="statement-cross right" aria-hidden="true">+</span></div>
        <div className="statement-bottom" data-reveal><span className="mono">BUILT AROUND YOUR THINKING</span><div><p>Your best work shouldn’t disappear into another chat. Atlas brings research, evidence, human judgment, and memory into one connected system.</p><Link className="editorial-link" href="/workspace">Meet your workspace <Arrow/></Link></div></div>
        <div className="principle-grid"><article data-reveal><span className="mono">01 / FIND</span><h3>Ask better questions.</h3><p>Bring a topic and your own AI provider. Keep scope, instructions, and sources together.</p></article><article data-reveal><span className="mono">02 / UNDERSTAND</span><h3>See what matters.</h3><p>Review structured findings and the evidence behind them, with uncertainty kept visible.</p></article><article data-reveal><span className="mono">03 / BUILD ON IT</span><h3>Make knowledge last.</h3><p>Save the context. Remember decisions. Continue from where the last discovery ended.</p></article></div>
      </section>

      <section ref={story} id="workflow" className="workflow-story" aria-labelledby="workflow-title">
        <div className="workflow-sticky"><div className="section-topline"><span className="mono">02 — FROM QUESTION TO KNOWLEDGE</span><span className="mono">{String(stage + 1).padStart(2, "0")} / 04</span></div>
          <div className="workflow-layout"><div className="workflow-copy"><span className="mono mint-text">THE RESEARCH ENGINE</span><h2 id="workflow-title">A clear path.<br/>At every layer.</h2><div className="stage-copy" key={stage}><span className="mono">{stages[stage].tag}</span><h3>{stages[stage].title}</h3><p>{stages[stage].text}</p><Link className="editorial-link" href={`/workspace?view=${stages[stage].view}`}>{stages[stage].action} <Arrow/></Link></div></div><div className="layer-visual"><img src="/visuals/knowledge-layers.webp" alt="Five translucent planes connected by an illuminated beam, representing persistent research knowledge" loading="lazy" width="1672" height="941"/><div className="layer-orbit" aria-hidden="true"/><div className="visual-caption mono">ATLAS KNOWLEDGE ARCHITECTURE<br/><span>CONCEPT VISUALIZATION / {stages[stage].label.toUpperCase()}</span></div></div></div>
          <div className="stage-selector" role="group" aria-label="Explore research stages">{stages.map((s,i) => <button key={s.label} aria-pressed={stage === i} className={stage === i ? "selected" : ""} onClick={() => chooseStage(i)}><span className="mono">0{i+1}</span><b>{s.label}</b><span className="stage-line"/></button>)}</div>
        </div>
      </section>

      <section className="workspace-section" id="workspace-preview"><div className="section-topline"><span className="mono">03 — DESIGNED TO GET OUT OF YOUR WAY</span><span className="mono">POWERFUL, WITHOUT THE COMPLEXITY.</span></div>
        <div className="workspace-section-heading" data-reveal><h2>Everything connected.<br/><span>Nothing in your way.</span></h2><p>A familiar workspace. A deeper research engine.<br/>Go from your first question to a growing knowledge library.</p></div>
        <div className="workspace-preview" data-reveal>
          <div className="preview-bar"><span><i/><i/><i/></span><span className="mono">ATLAS / YOUR RESEARCH WORKSPACE</span><span className="preview-badge">ILLUSTRATIVE PREVIEW</span></div>
          <div className="preview-body"><div className="preview-sidebar"><AtlasMark/><span className="preview-nav-active">◈ &nbsp; Overview</span><span>✳ &nbsp; Research</span><span>▱ &nbsp; Knowledge library</span><span>◎ &nbsp; Approvals</span><span>↗ &nbsp; History & resume</span><small>YOUR KNOWLEDGE, CONNECTED</small></div><div className="preview-main"><div className="preview-title"><div><span className="mono">YOUR NEXT DISCOVERY</span><h3>What will you uncover?</h3></div><span className="preview-spark">✳</span></div><form className="preview-composer" action="/workspace" onSubmit={event => { event.preventDefault(); transitionTo("Your research brief", () => router.push(`/workspace?view=research&topic=${encodeURIComponent(question)}`)); }}><input type="hidden" name="view" value="research"/><label htmlFor="entry-question">Start with a question</label><input id="entry-question" name="topic" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="What is changing in enterprise AI?" maxLength={2000}/><div><span className="mono">YOUR MODEL · YOUR INSTRUCTIONS</span><button type="submit" aria-label="Open research composer with your question"><Arrow/></button></div></form><div className="preview-shortcuts"><Link href="/workspace?view=library"><span>▱</span><b>Knowledge library</b><small>Every finding, connected.</small><Arrow/></Link><Link href="/workspace?view=approvals"><span>◎</span><b>Human judgment</b><small>You make the final call.</small><Arrow/></Link></div></div></div>
        </div>
        <div className="workspace-under"><p>Create your private account to explore the demo.<br/><span>Connect your provider when you’re ready for live research.</span></p><Link className="experience-button dark" href="/workspace">Enter Atlas <Arrow/></Link></div>
      </section>

      <section id="models" className="models-section"><div className="section-topline"><span className="mono">04 — MODEL INDEPENDENCE</span><span className="mono">YOUR INTELLIGENCE. YOUR CHOICE.</span></div><div className="models-heading" data-reveal><span className="mono mint-text">BRING YOUR OWN AI</span><h2>Change the model.<br/><span>Keep the memory.</span></h2><p>Native connections for leading providers. An OpenAI-compatible bridge for hosted models. One research workflow across them all.</p></div><div className="model-grid" data-reveal>{[ ["G","Gemini","NATIVE"], ["✳","Claude","NATIVE"], ["◎","OpenAI","NATIVE"], ["↗","OpenRouter","COMPATIBLE"], ["g","Groq","COMPATIBLE"], ["M","Mistral","COMPATIBLE"], ["∞","DeepSeek","COMPATIBLE"], ["+","Your endpoint","OPENAI-COMPATIBLE"] ].map(([icon,name,kind])=><Link key={name} href="/workspace?view=settings" className="model-cell"><span className="model-symbol" aria-hidden="true">{icon}</span><div><b>{name}</b><small className="mono">{kind}</small></div><Arrow/></Link>)}</div><div className="model-bottom"><p>Encrypted credentials. Provider health checks.<br/>Automatic routing with fallback support.</p><Link className="editorial-link" href="/workspace?view=settings">Connect a provider <Arrow/></Link></div></section>

      <section className="final-section"><div className="final-halo" aria-hidden="true"/><span className="mono">THE NEXT QUESTION IS YOURS.</span><h2 data-reveal>Think further.<br/><span>Start here.</span></h2><Link className="experience-button mint" href="/workspace?view=research">Open your research workspace <Arrow/></Link><p>Your private workspace. Your choice of AI for live research.</p></section>
    </main>
    <footer className="experience-footer"><Link className="experience-brand" href="/" aria-label="Atlas home"><AtlasMark/><span>ATLAS<small>RESEARCH OS</small></span></Link><p>A clearer way to build knowledge.</p><div><a href="#workflow">The workflow</a><Link href="/workspace?view=settings">Providers</Link><Link href="/workspace">Workspace ↗</Link></div><span className="mono">ATLAS / INDEPENDENT BY DESIGN</span></footer>
  </div>;
}

function Arrow(){return <svg className="experience-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}
function AtlasMark(){return <svg className="atlas-symbol" width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3 36 33H4L20 3Z" stroke="currentColor" strokeWidth="1.4"/><path d="M20 11 31 33M20 11 9 33M12 26h16M20 3v34" stroke="currentColor" strokeWidth="1.1"/><circle cx="20" cy="26" r="3" fill="currentColor"/></svg>}
