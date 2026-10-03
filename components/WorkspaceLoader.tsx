/** Real workspace-loading feedback: no artificial delay or simulated percentage. */
export default function WorkspaceLoader() {
  return <div className="workspace-arrival" role="status" aria-live="polite" aria-label="Opening your Atlas workspace">
    <header className="arrival-masthead" aria-hidden="true">
      <span className="arrival-brand">ATLAS<span>RESEARCH OS</span></span>
      <span className="arrival-indicator"><i/>A SPACE FOR DISCOVERY</span>
    </header>

    <div className="arrival-content" aria-hidden="true">
      <div className="arrival-emblem">
        <div className="arrival-aura"/>
        <svg viewBox="0 0 240 240" fill="none" className="arrival-orbit">
          <circle className="arrival-orbit-outline" cx="120" cy="120" r="101"/>
          <circle className="arrival-orbit-inner" cx="120" cy="120" r="82"/>
          <g className="arrival-orbit-turn">
            <circle className="arrival-orbit-arc" cx="120" cy="120" r="101" strokeDasharray="44 591"/>
            <circle className="arrival-orbit-point" cx="120" cy="19" r="3"/>
          </g>
          <path className="arrival-guides" d="M120 11v16M120 213v16M11 120h16M213 120h16"/>
        </svg>
        <div className="arrival-leaf arrival-leaf-back"/>
        <div className="arrival-leaf arrival-leaf-front"/>
        <svg viewBox="0 0 64 72" fill="none" className="arrival-monogram">
          <path d="M9 60 32 12 55 60M21 38h22"/>
          <path className="arrival-monogram-light" d="M32 12v48M17 60h30"/>
        </svg>
      </div>
      <p className="arrival-eyebrow">YOUR RESEARCH, CONNECTED</p>
      <h1>A little space for<br/><em>your next discovery.</em></h1>
      <p className="arrival-description">Opening your workspace</p>
      <div className="arrival-progress"><span/></div>
    </div>

    <footer className="arrival-footer" aria-hidden="true">
      <span>RESEARCH <i/> ORGANIZE <i/> REMEMBER</span>
      <span className="arrival-footnote">THOUGHTFULLY CONNECTED.</span>
    </footer>
  </div>;
}
