import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../game/store";

/**
 * Boot / splash screen — animated cyberpunk logo reveal.
 * Auto-advances to the main menu after ~2.6s, or on Enter / click.
 */
export function BootScene() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [phase, setLocalPhase] = useState<"glitch" | "reveal" | "tagline">("glitch");

  useEffect(() => {
    const t1 = setTimeout(() => setLocalPhase("reveal"), 700);
    const t2 = setTimeout(() => setLocalPhase("tagline"), 1500);
    const t3 = setTimeout(() => setPhase("MAIN_MENU"), 3200);
    const handler = (e: KeyboardEvent | MouseEvent) => {
      if ("code" in e && e.code !== "Enter" && e.code !== "Space") return;
      setPhase("MAIN_MENU");
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("click", handler);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
    };
  }, [setPhase]);

  return (
    <div className="absolute inset-0 overflow-hidden conic-bg scanlines crt-vignette flex items-center justify-center">
      {/* Hex grid */}
      <div className="absolute inset-0 hex-grid opacity-30" />

      {/* Radial pulse */}
      <motion.div
        className="absolute w-[140vmin] h-[140vmin] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,240,255,0.10), transparent 70%)",
        }}
        animate={{ scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {phase === "glitch" && (
          <motion.div
            className="font-display text-[12vmin] tracking-[0.3em] text-neon-cyan neon-text-cyan"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{
              opacity: [0, 1, 0.5, 1, 0.7, 1],
              x: [0, -4, 4, -2, 0],
            }}
            transition={{ duration: 0.6 }}
          >
            //SYS:ARENA.INIT
          </motion.div>
        )}

        {(phase === "reveal" || phase === "tagline") && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20, letterSpacing: "0.4em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.18em" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[18vmin] leading-none neon-text-cyan"
              style={{
                background: "linear-gradient(180deg, #00F0FF 0%, #FF2BD6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 18px rgba(255,43,214,0.4)) drop-shadow(0 0 8px rgba(0,240,255,0.6))",
              }}
            >
              BATTLEFORGE
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="font-ui tracking-[0.6em] text-[2.4vmin] text-neon-pink neon-text-pink uppercase mt-2"
            >
              NEON STEEL · CYBER SAMURAI
            </motion.div>
          </>
        )}

        {phase === "tagline" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 1, 1, 0.6, 1] }}
            transition={{ duration: 1.4, delay: 0.6 }}
            className="absolute bottom-[14vh] font-ui tracking-[0.4em] uppercase text-muted-text text-[1.6vmin]"
          >
            ▍ press start ▍
          </motion.div>
        )}
      </div>
    </div>
  );
}
