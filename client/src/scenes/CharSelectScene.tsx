import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../game/store";
import { FIGHTERS, type FighterDef } from "../data/characters";
import { STAGES } from "../data/stages";
import Fighter3D from "../components/Arena3D/Fighter3D";
import FloatingParticles from "../components/Arena3D/FloatingParticles";

type Step = "p1" | "p2" | "stage" | "confirm";

export function CharSelectScene() {
  const setPhase = useGameStore((s) => s.setPhase);
  const selectP1 = useGameStore((s) => s.selectP1);
  const selectP2 = useGameStore((s) => s.selectP2);
  const selectStage = useGameStore((s) => s.selectStage);
  const resetMatch = useGameStore((s) => s.resetMatch);

  const [step, setStep] = useState<Step>("p1");
  const [p1Idx, setP1Idx] = useState(0);
  const [p2Idx, setP2Idx] = useState(1);
  const [stageIdx, setStageIdx] = useState(0);

  const cols = 3;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Back to menu
      if (e.code === "Escape") {
        setPhase("MAIN_MENU");
        return;
      }
      // Stage selection step
      if (step === "stage") {
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          setStageIdx((i) => (i - 1 + STAGES.length) % STAGES.length);
        }
        if (e.code === "ArrowRight" || e.code === "KeyD") {
          setStageIdx((i) => (i + 1) % STAGES.length);
        }
        if (e.code === "Enter" || e.code === "Space") {
          selectStage(STAGES[stageIdx].id);
          setStep("confirm");
        }
        return;
      }
      if (step === "confirm") {
        if (e.code === "Enter" || e.code === "Space") {
          resetMatch();
          setPhase("MATCH_INTRO");
        }
        if (e.code === "Backspace") setStep("stage");
        return;
      }
      // p1 / p2 grid
      const idx = step === "p1" ? p1Idx : p2Idx;
      const setter = step === "p1" ? setP1Idx : setP2Idx;
      let next = idx;
      if (e.code === "ArrowLeft" || e.code === "KeyA")  next = (idx - 1 + FIGHTERS.length) % FIGHTERS.length;
      if (e.code === "ArrowRight" || e.code === "KeyD") next = (idx + 1) % FIGHTERS.length;
      if (e.code === "ArrowUp" || e.code === "KeyW")    next = (idx - cols + FIGHTERS.length) % FIGHTERS.length;
      if (e.code === "ArrowDown" || e.code === "KeyS")  next = (idx + cols) % FIGHTERS.length;
      if (next !== idx) {
        setter(next);
        return;
      }
      if (e.code === "Enter" || e.code === "Space") {
        if (step === "p1") {
          selectP1(FIGHTERS[p1Idx].id);
          setStep("p2");
        } else {
          // ensure p2 != p1 (allow but warn) — let any selection
          selectP2(FIGHTERS[p2Idx].id);
          setStep("stage");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, p1Idx, p2Idx, stageIdx, selectP1, selectP2, selectStage, setPhase, resetMatch]);

  const p1 = FIGHTERS[p1Idx];
  const p2 = FIGHTERS[p2Idx];
  const stage = STAGES[stageIdx];

  return (
    <div className="absolute inset-0 conic-bg overflow-hidden scanlines crt-vignette">
      {/* 3D backdrop — current fighter rotating */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 2.2, 7], fov: 42 }} gl={{ antialias: true, toneMapping: 4 }} shadows>
          <ambientLight intensity={0.18} color="#0a0030" />
          <directionalLight position={[2, 6, 4]} intensity={1.4} color="#dceaff" castShadow />
          <pointLight position={[-4, 3, 2]} intensity={1.1} color={(step === "p2" ? p2 : p1).primary} distance={12} />
          <pointLight position={[4, 3, -2]} intensity={0.8} color="#FF2BD6" distance={10} />
          <pointLight position={[0, 0.6, 2]} intensity={0.55} color={(step === "p2" ? p2 : p1).primary} distance={6} />

          {step !== "stage" && step !== "confirm" && (
            <ShowcaseRig meshKey={(step === "p2" ? p2 : p1).meshKey} side={step === "p2" ? "right" : "left"} />
          )}
          {step === "confirm" && (
            <>
              <SideRig meshKey={p1.meshKey} side="left" facingRight />
              <SideRig meshKey={p2.meshKey} side="right" facingRight={false} />
            </>
          )}
          {step === "stage" && (
            <>
              <SideRig meshKey={p1.meshKey} side="left" facingRight />
              <SideRig meshKey={p2.meshKey} side="right" facingRight={false} />
            </>
          )}

          {/* Platform */}
          <RotatingPlatform color={(step === "p2" ? p2 : p1).primary} />

          <FloatingParticles color={(step === "p2" ? p2 : p1).primary} />
          <fog attach="fog" args={[stage.skyTint, 10, 22]} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.22} luminanceSmoothing={0.82} intensity={2.0} mipmapBlur radius={0.7} />
            <ChromaticAberration
              offset={new Vector2(0.0009, 0.0009)}
              radialModulation={false}
              modulationOffset={0}
              blendFunction={BlendFunction.NORMAL}
            />
            <Vignette offset={0.28} darkness={0.62} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Foreground UI */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top header */}
        <div className="flex items-center justify-between px-[3vmin] pt-[2vmin] z-10">
          <div className="font-ui text-[1.4vmin] tracking-[0.4em] text-neon-cyan neon-text-cyan uppercase">
            ▍ {step === "stage" ? "STAGE SELECT" : step === "confirm" ? "STANDBY" : "FIGHTER SELECT"}
          </div>
          <StepIndicator step={step} />
        </div>

        {/* Center area — leave room for 3D */}
        <div className="flex-1 relative">
          {/* Left badge */}
          <AnimatePresence>
            {(step !== "stage" || true) && (
              <motion.div
                key="p1-badge"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-[8vmin] left-[3vmin] holo-panel rounded-sm px-4 py-3 w-[28vmin]"
              >
                <div className="font-ui text-[1vmin] tracking-[0.4em] text-neon-cyan uppercase">P1</div>
                <div
                  className="font-display text-[4.8vmin] leading-none mt-1"
                  style={{ color: p1.primary, textShadow: `0 0 8px ${p1.primary}` }}
                >
                  {p1.callsign}
                </div>
                <div className="font-ui text-[1.2vmin] tracking-[0.2em] uppercase text-muted-text mt-1">
                  {p1.archetype}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right badge */}
          <AnimatePresence>
            {(step === "p2" || step === "stage" || step === "confirm") && (
              <motion.div
                key="p2-badge"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-[8vmin] right-[3vmin] holo-panel rounded-sm px-4 py-3 w-[28vmin] text-right"
              >
                <div className="font-ui text-[1vmin] tracking-[0.4em] text-neon-pink uppercase">P2 · CPU</div>
                <div
                  className="font-display text-[4.8vmin] leading-none mt-1"
                  style={{ color: p2.primary, textShadow: `0 0 8px ${p2.primary}` }}
                >
                  {p2.callsign}
                </div>
                <div className="font-ui text-[1.2vmin] tracking-[0.2em] uppercase text-muted-text mt-1">
                  {p2.archetype}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom panel — grid or stage carousel */}
        <div className="px-[3vmin] pb-[3vmin] z-10">
          <AnimatePresence mode="wait">
            {(step === "p1" || step === "p2") && (
              <motion.div
                key={`grid-${step}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="holo-panel rounded-sm p-[2vmin]"
              >
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                  {FIGHTERS.map((f, i) => {
                    const active = (step === "p1" ? p1Idx : p2Idx) === i;
                    return (
                      <button
                        key={f.id}
                        onMouseEnter={() => step === "p1" ? setP1Idx(i) : setP2Idx(i)}
                        onClick={() => {
                          if (step === "p1") { selectP1(f.id); setStep("p2"); }
                          else                { selectP2(f.id); setStep("stage"); }
                        }}
                        className="relative aspect-square overflow-hidden group"
                        style={{
                          background: active
                            ? `linear-gradient(135deg, ${f.primary}40, ${f.secondary}30)`
                            : "rgba(7,4,30,0.6)",
                          boxShadow: active
                            ? `inset 0 0 0 2px ${f.primary}, 0 0 22px ${f.primary}80`
                            : "inset 0 0 0 1px rgba(0,240,255,0.18)",
                        }}
                      >
                        <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                          <div
                            className="font-display text-[1.8vmin] leading-none"
                            style={{
                              color: active ? f.primary : "#7F7BB2",
                              textShadow: active ? `0 0 8px ${f.primary}` : "none",
                            }}
                          >
                            {f.callsign}
                          </div>
                        </div>
                        <div
                          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[60%] h-[60%] rounded-md"
                          style={{
                            background: `radial-gradient(circle at 50% 40%, ${f.primary}, ${f.secondary})`,
                            opacity: active ? 0.85 : 0.45,
                            filter: active ? "blur(0.4px)" : "blur(1px)",
                            mixBlendMode: "screen",
                          }}
                        />
                        {active && (
                          <motion.div
                            layoutId={`select-ring-${step}`}
                            className="absolute inset-0 pointer-events-none"
                            style={{ boxShadow: `inset 0 0 0 2px ${f.primary}, 0 0 28px ${f.primary}` }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[1.2vmin] font-ui tracking-[0.28em] uppercase text-muted-text">
                  <span>{step === "p1" ? "Pick your fighter" : "Pick opponent"}</span>
                  <span>[Arrows] navigate · [Enter] lock in · [ESC] back</span>
                </div>
              </motion.div>
            )}

            {step === "stage" && (
              <motion.div
                key="stage-carousel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="holo-panel rounded-sm p-[2vmin]"
              >
                <div className="font-ui text-[1.2vmin] tracking-[0.32em] text-neon-cyan uppercase neon-text-cyan mb-2">
                  STAGE — {stage.district}
                </div>
                <div
                  className="font-display text-[6vmin] leading-none"
                  style={{ color: stage.tierColor, textShadow: `0 0 12px ${stage.tierColor}` }}
                >
                  {stage.name}
                </div>
                <p className="text-[1.4vmin] text-primary-text/80 italic mt-2 max-w-[60vmin]">
                  {stage.description}
                </p>
                <div className="flex gap-3 mt-4">
                  {STAGES.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setStageIdx(i)}
                      className="flex-1 px-3 py-2 text-left transition-all"
                      style={{
                        background: i === stageIdx
                          ? `linear-gradient(135deg, ${s.tierColor}35, transparent)`
                          : "rgba(7,4,30,0.55)",
                        boxShadow: i === stageIdx
                          ? `inset 0 0 0 1px ${s.tierColor}, 0 0 14px ${s.tierColor}50`
                          : "inset 0 0 0 1px rgba(0,240,255,0.18)",
                      }}
                    >
                      <div
                        className="font-display text-[2.2vmin] leading-none"
                        style={{ color: i === stageIdx ? s.tierColor : "#E8F4FF" }}
                      >
                        {s.name}
                      </div>
                      <div className="text-[1vmin] font-ui tracking-[0.18em] uppercase text-muted-text">
                        {s.district}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 font-ui text-[1.2vmin] tracking-[0.28em] uppercase text-muted-text">
                  [A/D] choose · [Enter] confirm · [ESC] back
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="holo-panel rounded-sm p-[2vmin] text-center"
              >
                <div className="font-ui text-[1.4vmin] tracking-[0.4em] text-neon-cyan uppercase">
                  ALL SYSTEMS NOMINAL — STAND BY FOR MATCH
                </div>
                <div className="font-display text-[5vmin] leading-none mt-2 neon-text-pink">
                  {p1.callsign} <span className="text-muted-text">VS</span> {p2.callsign}
                </div>
                <div className="mt-3 font-ui text-[1.3vmin] tracking-[0.28em] uppercase text-muted-text">
                  [Enter] begin · [Backspace] change stage
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ["p1", "p2", "stage", "confirm"];
  return (
    <div className="flex items-center gap-3 font-ui text-[1.2vmin] tracking-[0.3em] uppercase text-muted-text">
      {order.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${s === step ? "bg-neon-cyan" : i < order.indexOf(step) ? "bg-neon-pink" : "bg-muted-text/40"}`}
            style={s === step ? { boxShadow: "0 0 8px #00F0FF" } : {}}
          />
          <span className={s === step ? "text-neon-cyan" : ""}>{labelFor(s)}</span>
        </div>
      ))}
    </div>
  );
}

function labelFor(s: Step) {
  if (s === "p1") return "P1";
  if (s === "p2") return "P2";
  if (s === "stage") return "STAGE";
  return "READY";
}

function ShowcaseRig({ meshKey, side }: { meshKey: string; side: "left" | "right" }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.5 + (side === "right" ? -0.4 : 0.4);
  });
  return (
    <group ref={groupRef}>
      <Fighter3D character={meshKey} position={[0, 0, 0]} facingRight={true} action="idle" />
    </group>
  );
}

function SideRig({ meshKey, side, facingRight }: { meshKey: string; side: "left" | "right"; facingRight: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const x = side === "left" ? -2.0 : 2.0;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 1.6 + (side === "left" ? 0 : Math.PI)) * 0.04;
  });
  return (
    <group ref={ref} position={[x, 0, 0]} rotation={[0, side === "right" ? -0.2 : 0.2, 0]}>
      <Fighter3D character={meshKey} position={[0, 0, 0]} facingRight={facingRight} action="idle" />
    </group>
  );
}

function RotatingPlatform({ color }: { color: string }) {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (innerRef.current) {
      (innerRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.4 + Math.sin(t * 1.6) * 0.4;
      innerRef.current.rotation.z = -t * 0.25;
    }
    if (outerRef.current) {
      outerRef.current.rotation.z = t * 0.18;
      (outerRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(t * 1.1 + 1.5) * 0.4;
    }
  });
  return (
    <group>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[1.7, 1.78, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.9} />
      </mesh>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[2.6, 2.66, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[2.7, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} transparent opacity={0.16} />
      </mesh>
    </group>
  );
}
