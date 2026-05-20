import { useEffect, useRef } from "react";
import type { CombatEngine } from "../game/engine";
import type { FighterDef } from "../data/characters";

interface Props {
  engineRef: React.MutableRefObject<CombatEngine | null>;
  role: "p1" | "p2";
  fighter: FighterDef;
  align: "left" | "right";
  roundsWon: number;
}

/**
 * Animated cyberpunk health bar.
 * The fill width is driven by RAF + ref styling — no React re-renders per frame.
 */
export function HealthBar({ engineRef, role, fighter, align, roundsWon }: Props) {
  const fillRef    = useRef<HTMLDivElement>(null);
  const shadowRef  = useRef<HTMLDivElement>(null);   // lagging "damage" shadow
  const energyRef  = useRef<HTMLDivElement>(null);
  const ultRef     = useRef<HTMLDivElement>(null);
  const comboRef   = useRef<HTMLDivElement>(null);
  const comboCountRef = useRef<HTMLSpanElement>(null);

  const shadowPct = useRef(100);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const eng = engineRef.current;
      if (eng) {
        const f = role === "p1" ? eng.p1 : eng.p2;
        const hp = (f.health / f.maxHealth) * 100;
        const energy = f.energy;
        if (fillRef.current) {
          fillRef.current.style.width = `${hp}%`;
        }
        // Damage shadow follows behind real HP slowly (creates "chip" effect)
        if (shadowRef.current) {
          shadowPct.current += (hp - shadowPct.current) * 0.07;
          shadowRef.current.style.width = `${shadowPct.current}%`;
        }
        if (energyRef.current) {
          energyRef.current.style.width = `${energy}%`;
        }
        if (ultRef.current) {
          ultRef.current.style.opacity = f.ultReady ? "1" : "0";
        }
        if (comboRef.current && comboCountRef.current) {
          if (f.comboCount >= 2) {
            comboRef.current.style.opacity = "1";
            comboCountRef.current.textContent = String(f.comboCount);
          } else {
            comboRef.current.style.opacity = "0";
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef, role]);

  const isRight = align === "right";

  return (
    <div className={`relative flex-1 ${isRight ? "items-end text-right" : "items-start text-left"} flex flex-col`}>
      {/* Top row: name + rounds */}
      <div className={`flex items-baseline gap-3 mb-1 ${isRight ? "flex-row-reverse" : ""}`}>
        <div className="flex items-center gap-2">
          <RoundPip lit={roundsWon >= 1} color={fighter.primary} />
          <RoundPip lit={roundsWon >= 2} color={fighter.primary} />
        </div>
        <div
          className="font-display text-[3.2vmin] leading-none"
          style={{ color: fighter.primary, textShadow: `0 0 6px ${fighter.primary}` }}
        >
          {fighter.callsign}
        </div>
        <div className={`font-ui text-[1.1vmin] tracking-[0.32em] uppercase text-muted-text ${isRight ? "text-right" : "text-left"} hidden md:block`}>
          {fighter.archetype}
        </div>
      </div>

      {/* Main HP bar */}
      <div
        className={`relative w-full h-[2.4vmin] ${isRight ? "skew-bar-rev" : "skew-bar"}`}
        style={{
          background: "rgba(7,4,30,0.85)",
          boxShadow: `inset 0 0 0 1px ${fighter.primary}88, 0 0 18px ${fighter.primary}55`,
        }}
      >
        {/* damage shadow (yellow chip) */}
        <div
          ref={shadowRef}
          className="absolute top-0 h-full"
          style={{
            background: "linear-gradient(180deg, #FFC53A 0%, #FF6B3D 100%)",
            width: "100%",
            ...(isRight ? { right: 0 } : { left: 0 }),
          }}
        />
        {/* actual HP fill */}
        <div
          ref={fillRef}
          className="absolute top-0 h-full"
          style={{
            background: `linear-gradient(180deg, ${fighter.primary} 0%, ${fighter.secondary} 100%)`,
            width: "100%",
            boxShadow: `0 0 18px ${fighter.primary}, inset 0 1px 0 rgba(255,255,255,0.35)`,
            transition: "width 80ms linear",
            ...(isRight ? { right: 0 } : { left: 0 }),
          }}
        />
        {/* Scrolling shine */}
        <div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            width: "100%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
            backgroundSize: "120px 100%",
            backgroundRepeat: "repeat-x",
            opacity: 0.5,
            mixBlendMode: "screen",
            animation: "meter-flow 2.4s linear infinite",
            ...(isRight ? { right: 0 } : { left: 0 }),
          }}
        />
      </div>

      {/* Energy / ULT bar */}
      <div
        className={`relative w-[60%] h-[1.1vmin] mt-1 ${isRight ? "skew-bar-rev self-end" : "skew-bar"}`}
        style={{
          background: "rgba(7,4,30,0.8)",
          boxShadow: "inset 0 0 0 1px rgba(0,240,255,0.5)",
        }}
      >
        <div
          ref={energyRef}
          className="absolute top-0 h-full meter-flow"
          style={{
            width: "0%",
            ...(isRight ? { right: 0 } : { left: 0 }),
          }}
        />
        <div
          ref={ultRef}
          className="absolute -top-[1.6vmin] font-ui text-[1.1vmin] tracking-[0.32em] uppercase animate-pulse-neon"
          style={{
            color: fighter.primary, textShadow: `0 0 8px ${fighter.primary}`,
            opacity: 0,
            ...(isRight ? { right: 0 } : { left: 0 }),
          }}
        >
          ULTIMATE READY ▸
        </div>
      </div>

      {/* Combo counter */}
      <div
        ref={comboRef}
        className={`absolute pointer-events-none ${isRight ? "left-2" : "right-2"} top-[110%]`}
        style={{ opacity: 0, transition: "opacity 0.2s" }}
      >
        <div className="flex items-baseline gap-2">
          <span className="combo-text text-[3vmin] text-neon-gold neon-text-gold leading-none">
            <span ref={comboCountRef}>0</span>
          </span>
          <span className="combo-text text-[1.6vmin] text-neon-red neon-text-red leading-none">HIT COMBO</span>
        </div>
      </div>
    </div>
  );
}

function RoundPip({ lit, color }: { lit: boolean; color: string }) {
  return (
    <div
      className="w-[1.4vmin] h-[1.4vmin] rotate-45"
      style={{
        background: lit ? color : "transparent",
        boxShadow: lit ? `0 0 10px ${color}, inset 0 0 0 1px ${color}` : `inset 0 0 0 1px ${color}66`,
      }}
    />
  );
}
