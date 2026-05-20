import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../game/store";
import { FIGHTERS } from "../data/characters";
import Fighter3D from "../components/Arena3D/Fighter3D";
import FloatingParticles from "../components/Arena3D/FloatingParticles";

/**
 * Cinematic main menu — rotating 3D fighter showcase + holographic menu panels.
 */
const MENU_ITEMS = [
  { id: "vs-cpu",   label: "VS CPU",   sub: "Single arcade match",          enabled: true },
  { id: "training", label: "TRAINING", sub: "Practice combos and timing",   enabled: true },
  { id: "options",  label: "OPTIONS",  sub: "Audio and controls",           enabled: false },
  { id: "credits",  label: "CREDITS",  sub: "Forged by the BattleForge crew", enabled: false },
];

export function MenuScene() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [hover, setHover] = useState(0);
  const [showcaseIdx, setShowcaseIdx] = useState(0);

  // Cycle showcase fighter every 4s
  useEffect(() => {
    const t = setInterval(() => setShowcaseIdx((i) => (i + 1) % FIGHTERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        setHover((h) => (h - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setHover((h) => (h + 1) % MENU_ITEMS.length);
      }
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        const item = MENU_ITEMS[hover];
        if (item.enabled) handleSelect(item.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hover]);

  const handleSelect = (id: string) => {
    if (id === "vs-cpu" || id === "training") {
      setPhase("CHARACTER_SELECT");
    }
  };

  const showcase = FIGHTERS[showcaseIdx];

  return (
    <div className="absolute inset-0 conic-bg overflow-hidden scanlines crt-vignette">
      {/* 3D showcase canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [3.5, 2.5, 5.5], fov: 38 }}
          gl={{ antialias: true, toneMapping: 4 }}
          shadows
        >
          <ambientLight intensity={0.18} color="#0a0030" />
          <directionalLight position={[3, 6, 3]} intensity={1.3} color="#dceaff" castShadow />
          <pointLight position={[-3, 3, 2]} intensity={1.0} color={showcase.primary} distance={10} />
          <pointLight position={[3, 1.5, -2]} intensity={0.9} color="#FF2BD6" distance={8} />
          <pointLight position={[0, 0.4, 1]} intensity={0.55} color={showcase.primary} distance={5} />

          <RotatingShowcase meshKey={showcase.meshKey} />
          <FloatingParticles color={showcase.primary} />

          {/* Holo platform */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[1.2, 1.3, 64]} />
            <meshStandardMaterial
              color={showcase.primary}
              emissive={showcase.primary}
              emissiveIntensity={1.6}
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <circleGeometry args={[1.3, 64]} />
            <meshStandardMaterial
              color={showcase.primary}
              emissive={showcase.primary}
              emissiveIntensity={0.4}
              transparent
              opacity={0.25}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[1.55, 1.62, 64]} />
            <meshStandardMaterial color="#FF2BD6" emissive="#FF2BD6" emissiveIntensity={1.2} transparent opacity={0.6} />
          </mesh>

          <fog attach="fog" args={["#04020E", 8, 18]} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.8} intensity={2.0} mipmapBlur radius={0.7} />
            <ChromaticAberration
              offset={new Vector2(0.0009, 0.0009)}
              radialModulation={false}
              modulationOffset={0}
              blendFunction={BlendFunction.NORMAL}
            />
            <Vignette offset={0.28} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Foreground UI */}
      <div className="absolute inset-0 flex">
        {/* Left side: title + menu */}
        <div className="w-[44%] h-full flex flex-col justify-between p-[5vmin] z-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="font-ui text-[1.4vmin] tracking-[0.4em] text-neon-cyan uppercase neon-text-cyan"
            >
              ▍ BATTLEFORGE //ARC-V7
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-[12vmin] leading-[0.9] mt-3"
              style={{
                background: "linear-gradient(135deg, #00F0FF 0%, #FF2BD6 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 16px rgba(255,43,214,0.35))",
              }}
            >
              NEON<br/>STEEL
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.4 }}
              className="font-ui tracking-[0.32em] text-[1.4vmin] uppercase text-muted-text mt-3"
            >
              Cyberpunk samurai arcade fighter
            </motion.p>
          </div>

          {/* Menu */}
          <div className="space-y-3 mb-[2vmin]">
            {MENU_ITEMS.map((item, idx) => (
              <motion.button
                key={item.id}
                onMouseEnter={() => setHover(idx)}
                onClick={() => item.enabled && handleSelect(item.id)}
                disabled={!item.enabled}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: item.enabled ? 1 : 0.35, x: hover === idx ? 14 : 0 }}
                transition={{ duration: 0.25 }}
                className={`block w-full text-left group ${item.enabled ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                <div className="flex items-baseline gap-4">
                  <span className={`font-display text-[5vmin] leading-none ${hover === idx ? "text-neon-cyan neon-text-cyan" : "text-primary-text"}`}>
                    {item.label}
                  </span>
                  {hover === idx && (
                    <motion.span
                      layoutId="menu-arrow"
                      className="font-mono text-[2vmin] text-neon-pink neon-text-pink"
                    >
                      ◄◄
                    </motion.span>
                  )}
                </div>
                <div className={`font-ui text-[1.3vmin] tracking-[0.28em] uppercase ${hover === idx ? "text-neon-pink" : "text-muted-text"}`}>
                  {item.sub}{!item.enabled && " · locked"}
                </div>
              </motion.button>
            ))}
            <div className="pt-6 font-ui text-[1.2vmin] tracking-[0.28em] uppercase text-muted-text">
              [W/S] navigate &nbsp;·&nbsp; [Enter] select
            </div>
          </div>
        </div>

        {/* Right side: fighter spec sheet */}
        <div className="flex-1 h-full flex items-end justify-end p-[5vmin] z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={showcase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="holo-panel rounded-sm p-[3vmin] w-[36vmin]"
            >
              <div className="font-ui text-[1.2vmin] tracking-[0.32em] uppercase text-neon-cyan neon-text-cyan">
                ▍ SHOWCASE
              </div>
              <div
                className="font-display text-[5.4vmin] leading-none mt-1"
                style={{ color: showcase.primary, textShadow: `0 0 8px ${showcase.primary}` }}
              >
                {showcase.callsign}
              </div>
              <div className="font-ui text-[1.4vmin] tracking-[0.18em] uppercase text-muted-text">
                {showcase.archetype}
              </div>
              <div className="mt-3 text-[1.3vmin] text-primary-text/80 italic">
                "{showcase.intro}"
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[1.3vmin]">
                <Stat label="POWER"   value={showcase.stats.power} />
                <Stat label="SPEED"   value={showcase.stats.speed} />
                <Stat label="DEFENSE" value={showcase.stats.defense} />
                <Stat label="KI"      value={showcase.stats.ki} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* HUD chrome top-right */}
      <div className="absolute top-[2vmin] right-[2vmin] font-mono text-[1.2vmin] text-muted-text tracking-[0.2em] uppercase z-20">
        SERVER //01 · LATENCY 12ms · PUBLIC ARENA
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neon-cyan/80 w-[7ch] uppercase">{label}</span>
      <span className="flex-1 flex gap-[2px]">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-[1.4vmin] flex-1 ${i < value ? "bg-neon-cyan/80" : "bg-neon-cyan/15"}`}
            style={i < value ? { boxShadow: "0 0 5px rgba(0,240,255,0.7)" } : {}}
          />
        ))}
      </span>
    </div>
  );
}

function RotatingShowcase({ meshKey }: { meshKey: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.35 + 0.6;
    }
  });
  return (
    <group ref={ref}>
      <Fighter3D character={meshKey} position={[0, 0, 0]} facingRight={true} action="idle" />
    </group>
  );
}
