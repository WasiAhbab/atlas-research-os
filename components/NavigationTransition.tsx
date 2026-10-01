"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
type Navigate = (label: string, action: () => void) => void;
const TransitionContext = createContext<Navigate>((_, action) => action());
export const useNavigationTransition = () => useContext(TransitionContext);

/** Brief navigation feedback, separate from real request/loading state. */
export default function NavigationTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [transition, setTransition] = useState<{ label: string; exiting: boolean } | null>(null);
  const locked = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const navigate = useCallback<Navigate>((label, action) => {
    if (locked.current) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector(".atlas-experience.motion-paused");
    if (reduce || location.pathname.startsWith("/workspace")) { action(); return; }
    locked.current = true;
    setTransition({ label, exiting: false });
    timers.current.push(setTimeout(() => {
      try { action(); }
      finally {
        timers.current.push(setTimeout(() => setTransition({label, exiting:true}), 270));
        timers.current.push(setTimeout(() => { setTransition(null); locked.current = false; timers.current = []; }, 470));
      }
    }, 330));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.classList.contains("skip-link")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      const samePage = url.pathname === location.pathname && url.search === location.search;
      if (samePage && !url.hash) return;
      event.preventDefault();
      const label = link.getAttribute("aria-label") || link.textContent?.trim().replace(/\s+/g," ").slice(0,55) || "Your workspace";
      navigate(label, () => {
        if (samePage && url.hash) {
          let target: HTMLElement | null = null;
          try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
          if (target) { history.pushState(null, "", url.hash); target.scrollIntoView({behavior:"instant",block:"start"}); target.setAttribute("tabindex","-1"); target.focus({preventScroll:true}); }
        } else router.push(url.pathname + url.search + url.hash);
      });
    };
    document.addEventListener("click",handle,true);
    return () => document.removeEventListener("click",handle,true);
  }, [navigate,router]);
  return <TransitionContext.Provider value={navigate}>{children}{transition && <div className={`navigation-veil ${transition.exiting ? "is-unveiling" : ""}`} role="status" aria-live="polite" aria-label={`Opening ${transition.label}`}><div className="veil-noise"/><div className="veil-shutter veil-left"/><div className="veil-shutter veil-right"/><div className="veil-center"><div className="unwrap-symbol" aria-hidden="true"><i/><i/><i/><span>✳</span></div><span className="veil-wordmark">ATLAS</span><span className="veil-destination">{transition.label}</span><div className="veil-track" aria-hidden="true"><span/></div></div><span className="veil-foot" aria-hidden="true">A LITTLE SPACE FOR YOUR NEXT THOUGHT.</span></div>}</TransitionContext.Provider>;
}
