import { useEffect, useRef } from "react";
import type { CombatEngine } from "../game/engine";

export function Timer({ engineRef }: { engineRef: React.MutableRefObject<CombatEngine | null> }) {
  const txtRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const eng = engineRef.current;
      if (eng && txtRef.current) {
        const t = Math.max(0, Math.ceil(eng.timeLeft));
        txtRef.current.textContent = String(t).padStart(2, "0");
        if (t <= 10) {
          txtRef.current.style.color = "#FF2D55";
          txtRef.current.style.textShadow = "0 0 10px #FF2D55, 0 0 24px rgba(255,45,85,0.6)";
        } else {
          txtRef.current.style.color = "#FFC53A";
          txtRef.current.style.textShadow = "0 0 8px #FFC53A, 0 0 18px rgba(255,197,58,0.5)";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  return (
    <div className="relative w-[12vmin] h-[8vmin] flex items-center justify-center mx-2">
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(7,4,30,0.78)",
          clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)",
          boxShadow: "inset 0 0 0 1px rgba(255,197,58,0.55), 0 0 22px rgba(255,197,58,0.18)",
        }}
      />
      <div
        ref={txtRef}
        className="relative font-display text-[5.2vmin] leading-none tracking-tight"
        style={{ color: "#FFC53A", textShadow: "0 0 8px #FFC53A" }}
      >
        90
      </div>
    </div>
  );
}
