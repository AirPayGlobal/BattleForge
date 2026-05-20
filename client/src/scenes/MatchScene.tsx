import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { Vector2 } from "three";
import { motion, AnimatePresence } from "framer-motion";

import { useGameStore } from "../game/store";
import { CombatEngine } from "../game/engine";
import { LiveFighter } from "../game/LiveFighter";
import { CombatTicker } from "../game/CombatTicker";
import { useKeyboardInput } from "../game/useInput";
import { makeAIController } from "../game/ai";
import { ROUNDS_TO_WIN } from "../game/constants";

import { getFighter } from "../data/characters";
import { getStage } from "../data/stages";

import ArenaFloor from "../components/Arena3D/ArenaFloor";
import CityScape from "../components/Arena3D/CityScape";
import FloatingParticles from "../components/Arena3D/FloatingParticles";
import Crowd from "../components/Arena3D/Crowd";

import { HealthBar } from "../ui/HealthBar";
import { Timer } from "../ui/Timer";
import { Announcer } from "../ui/Announcer";
import { HitMarkers, type DamagePopup } from "../ui/HitMarker";

type Phase = "intro" | "fighting" | "round_end" | "ko_cinematic" | "match_end";

export function MatchScene() {
  const p1Id = useGameStore((s) => s.p1Id);
  const p2Id = useGameStore((s) => s.p2Id);
  const stageId = useGameStore((s) => s.stageId);
  const setPhase = useGameStore((s) => s.setPhase);
  const setMatchWinner = useGameStore((s) => s.setMatchWinner);

  const p1Def = getFighter(p1Id);
  const p2Def = getFighter(p2Id);
  const stage = getStage(stageId);

  const engineRef = useRef<CombatEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new CombatEngine({ p1Id, p2Id, roundsToWin: ROUNDS_TO_WIN });
  }

  const { consume } = useKeyboardInput(true);
  const ai = useMemo(() => makeAIController({ difficulty: "normal" }), []);

  // Local phase machine drives intro / round / KO / match end overlays
  const [phase, setLocalPhase] = useState<Phase>("intro");
  const [announce, setAnnounce] = useState<{ text: string; tone: "cyan" | "pink" | "gold" | "red" } | null>(null);
  const announceTokenRef = useRef(0);
  const setAnnounceTimed = (
    text: string,
    tone: "cyan" | "pink" | "gold" | "red",
    durationMs: number | null,
  ) => {
    const tok = ++announceTokenRef.current;
    setAnnounce({ text, tone });
    if (durationMs !== null) {
      setTimeout(() => {
        if (announceTokenRef.current === tok) setAnnounce(null);
      }, durationMs);
    }
  };
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const popupIdRef = useRef(0);
  const [shakeClass, setShakeClass] = useState("");
  const [flash, setFlash] = useState<{ color: string; id: number } | null>(null);
  const [koWinner, setKoWinner] = useState<"p1" | "p2" | null>(null);
  const [roundDisplay, setRoundDisplay] = useState(1);
  const [p1RoundsWon, setP1RoundsWon] = useState(0);
  const [p2RoundsWon, setP2RoundsWon] = useState(0);

  // Intro: ANNOUNCE → ROUND N → FIGHT! → fight
  useEffect(() => {
    if (phase !== "intro") return;
    const sequence = async () => {
      setAnnounceTimed(`ROUND ${roundDisplay}`, "cyan", null);
      await wait(1100);
      setAnnounceTimed("FIGHT!", "pink", null);
      await wait(700);
      setAnnounce(null);
      announceTokenRef.current++;
      engineRef.current?.startFight();
      setLocalPhase("fighting");
    };
    const t = setTimeout(sequence, 600);
    return () => clearTimeout(t);
  }, [phase, roundDisplay]);

  // After-tick handler: drain engine events into UI
  const handleAfterTick = () => {
    const eng = engineRef.current;
    if (!eng) return;
    const events = eng.drainEvents();
    if (events.length === 0) return;

    let newPopups: DamagePopup[] = [];
    for (const ev of events) {
      if (ev.type === "hit" || ev.type === "block") {
        const nextId = ++popupIdRef.current;
        newPopups.push({
          id: nextId,
          damage: ev.damage,
          heavy: ev.heavy,
          blocked: ev.type === "block",
          x: arenaXToScreen(ev.x),
          y: 0.40 - ev.y * 0.04,
        });

        // Camera shake + flash
        if (ev.type === "hit") {
          setShakeClass(ev.heavy ? "shake-heavy" : "shake-light");
          setTimeout(() => setShakeClass(""), 540);
          setFlash({ color: ev.heavy ? "#FF2BD6" : "#00F0FF", id: nextId });
          setTimeout(() => setFlash(null), 180);
        }
      }
      if (ev.type === "ultimate") {
        setAnnounceTimed(
          ev.attacker === "p1" ? p1Def.ultimateLabel : p2Def.ultimateLabel,
          "pink",
          1100,
        );
      }
      if (ev.type === "ko") {
        setKoWinner(ev.attacker as "p1" | "p2");
        triggerKO(ev.attacker as "p1" | "p2");
      }
    }
    if (newPopups.length) {
      setPopups((prev) => [...prev, ...newPopups]);
      // auto-clean popups after 800ms
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => !newPopups.find((np) => np.id === p.id)));
      }, 800);
    }
  };

  const triggerKO = (_winner: "p1" | "p2") => {
    setLocalPhase("ko_cinematic");
    setAnnounceTimed("K.O.", "red", null);
    setShakeClass("shake-heavy");
    setTimeout(() => setShakeClass(""), 700);

    // After cinematic, advance round
    setTimeout(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const newP1 = eng.p1.roundsWon;
      const newP2 = eng.p2.roundsWon;
      setP1RoundsWon(newP1);
      setP2RoundsWon(newP2);

      if (newP1 >= ROUNDS_TO_WIN || newP2 >= ROUNDS_TO_WIN) {
        setMatchWinner(newP1 >= ROUNDS_TO_WIN ? "p1" : "p2");
        setAnnounceTimed(
          newP1 >= ROUNDS_TO_WIN ? p1Def.callsign + " WINS" : p2Def.callsign + " WINS",
          "gold",
          null,
        );
        setLocalPhase("match_end");
        setTimeout(() => setPhase("MATCH_END"), 3000);
      } else {
        setAnnounce(null);
        announceTokenRef.current++;
        eng.startNextRound();
        setRoundDisplay(eng.round);
        setLocalPhase("intro");
      }
    }, 2600);
  };

  // ESC → back to menu
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Escape") setPhase("MAIN_MENU");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setPhase]);

  const pumpInputs = () => {
    const eng = engineRef.current;
    if (!eng) return;
    if (phase === "fighting") {
      eng.setInput("p1", consume());
      eng.setInput("p2", ai(eng));
    } else {
      // hold inputs neutral during cinematics so nothing fires
      eng.setInput("p1", { left: false, right: false, jump: false, block: false, light: false, heavy: false, kick: false, ultimate: false });
      eng.setInput("p2", { left: false, right: false, jump: false, block: false, light: false, heavy: false, kick: false, ultimate: false });
      consume(); // discard
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-void-black">
      {/* 3D Arena Canvas — gets shake class for full-screen impact feel */}
      <div className={`absolute inset-0 ${shakeClass}`}>
        <Canvas
          shadows
          camera={{ position: [0, 2.5, 9], fov: 52 }}
          gl={{ antialias: true, toneMapping: 4 }}
        >
          <ArenaWorld stage={stage} engineRef={engineRef} phase={phase} koWinner={koWinner} />

          <LiveFighter engineRef={engineRef} role="p1" />
          <LiveFighter engineRef={engineRef} role="p2" />

          <CombatTicker
            engineRef={engineRef}
            pumpInputs={pumpInputs}
            onAfterTick={handleAfterTick}
          />

          <EffectComposer>
            <Bloom luminanceThreshold={0.22} luminanceSmoothing={0.82} intensity={2.4} mipmapBlur radius={0.75} />
            <ChromaticAberration
              offset={new Vector2(0.0009, 0.0009)}
              radialModulation={false}
              modulationOffset={0}
              blendFunction={BlendFunction.NORMAL}
            />
            <Vignette offset={0.30} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Hit flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 pointer-events-none z-20"
            style={{ background: flash.color, mixBlendMode: "screen" }}
          />
        )}
      </AnimatePresence>

      {/* Damage popups */}
      <HitMarkers popups={popups} />

      {/* HUD chrome */}
      <div className="absolute top-0 left-0 right-0 p-[2vmin] pointer-events-none z-30 scanlines">
        <div className="flex items-start gap-3">
          <HealthBar engineRef={engineRef} role="p1" fighter={p1Def} align="left" roundsWon={p1RoundsWon} />
          <Timer engineRef={engineRef} />
          <HealthBar engineRef={engineRef} role="p2" fighter={p2Def} align="right" roundsWon={p2RoundsWon} />
        </div>
      </div>

      {/* Stage label bottom-left */}
      <div className="absolute bottom-[1.5vmin] left-[2vmin] font-ui text-[1.2vmin] tracking-[0.32em] uppercase text-muted-text z-30">
        ▍ {stage.name} · {stage.district}
      </div>
      <div className="absolute bottom-[1.5vmin] right-[2vmin] font-ui text-[1.2vmin] tracking-[0.32em] uppercase text-muted-text z-30">
        [A/D] move · [W] jump · [S] block · [J] light · [K] heavy · [L] kick · [SPACE] ultimate · [ESC] menu
      </div>

      {/* Announcer overlay (ROUND 1, FIGHT, KO, WINNER) */}
      <Announcer text={announce?.text ?? null} tone={announce?.tone ?? "cyan"} />

      {/* Match-end overlay backdrop */}
      <AnimatePresence>
        {phase === "match_end" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 25,
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 25%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

/** Maps arena x (-4.5..4.5) to screen 0..1 horizontally, used for popup placement. */
function arenaXToScreen(x: number) {
  // arena spans 9 units → about 60% of viewport width
  return 0.5 + (x / 9.0) * 0.62;
}

// ────────────────────────────────────────────────────────────────────────────────
// Arena world: lights, floor, city, particles, crowd, fog, camera controller.
// ────────────────────────────────────────────────────────────────────────────────

function ArenaWorld({
  stage,
  engineRef,
  phase,
  koWinner,
}: {
  stage: { tierColor: string; skyTint: string };
  engineRef: React.MutableRefObject<CombatEngine | null>;
  phase: Phase;
  koWinner: "p1" | "p2" | null;
}) {
  const rimL = useRef<THREE.PointLight>(null);
  const rimR = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rimL.current) rimL.current.intensity = 1.20 + Math.sin(t * 1.7) * 0.30;
    if (rimR.current) rimR.current.intensity = 1.20 + Math.sin(t * 1.7 + Math.PI) * 0.30;
  });

  return (
    <>
      {/* Camera director — controls FOV, shake, intro pan, KO zoom */}
      <CameraDirector engineRef={engineRef} phase={phase} koWinner={koWinner} />

      <ambientLight intensity={0.16} color="#0a0020" />
      <directionalLight
        position={[4, 10, 6]}
        intensity={1.5}
        castShadow
        color="#ece8ff"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={32}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <directionalLight position={[0, 3, 9]} intensity={0.32} color="#2040ff" />
      <pointLight ref={rimL} position={[-4, 4.5, -1.5]} intensity={1.2} color={stage.tierColor} distance={14} />
      <pointLight ref={rimR} position={[ 4, 4.5, -1.5]} intensity={1.2} color={stage.tierColor} distance={14} />
      <pointLight position={[0, 0.1, 0.5]} intensity={0.55} color={stage.tierColor} distance={7} />
      <pointLight position={[0, 7, -6]} intensity={0.8} color="#6010e0" distance={18} />

      <ArenaFloor tierColor={stage.tierColor} />
      <CityScape />
      <FloatingParticles color={stage.tierColor} />
      <Crowd tierColor={stage.tierColor} />

      <fog attach="fog" args={[stage.skyTint, 11, 22]} />
    </>
  );
}

/** Camera controller — uses engine.shake + phase for cinematic feel. */
function CameraDirector({
  engineRef,
  phase,
  koWinner,
}: {
  engineRef: React.MutableRefObject<CombatEngine | null>;
  phase: Phase;
  koWinner: "p1" | "p2" | null;
}) {
  const { camera } = useThree();

  // Intro animation timer — re-arms when phase transitions into intro
  const introStart = useRef<number | null>(null);
  const prevPhase = useRef<Phase>(phase);

  useEffect(() => {
    if (phase === "intro" && prevPhase.current !== "intro") {
      introStart.current = performance.now() / 1000;
    }
    prevPhase.current = phase;
  }, [phase]);

  useFrame(({ clock }) => {
    const eng = engineRef.current;
    if (!eng) return;

    const t = clock.elapsedTime;
    const midX = (eng.p1.x + eng.p2.x) * 0.5;

    let targetX = midX * 0.45;
    let targetY = 2.5;
    let targetZ = 9.0;
    let targetFov = 52;

    if (phase === "intro" && introStart.current !== null) {
      const elapsed = t - introStart.current;
      const k = Math.min(1, elapsed / 1.6);
      // sweep from low-side to standard
      const ease = 1 - Math.pow(1 - k, 3);
      const startX = -4.0, startY = 1.4, startZ = 6.0;
      targetX = startX + (midX * 0.45 - startX) * ease;
      targetY = startY + (2.5 - startY) * ease;
      targetZ = startZ + (9.0 - startZ) * ease;
      targetFov = 48 + 4 * ease;
    } else if (phase === "ko_cinematic" && koWinner) {
      const loser = koWinner === "p1" ? eng.p2 : eng.p1;
      targetX = loser.x * 0.6;
      targetY = 1.8;
      targetZ = 6.2;
      targetFov = 42;
    } else if (phase === "fighting") {
      // dynamic FOV based on action
      const anyAtk =
        eng.p1.action === "punch" || eng.p1.action === "kick" || eng.p1.action === "weapon-strike" ||
        eng.p2.action === "punch" || eng.p2.action === "kick" || eng.p2.action === "weapon-strike";
      targetFov = anyAtk ? 56 : 52;
    }

    // shake
    const shake = eng.shake;
    const shakeX = (Math.sin(t * 64) * 0.5 + Math.sin(t * 91) * 0.5) * shake * 0.20;
    const shakeY = (Math.sin(t * 73) * 0.5 + Math.sin(t * 113) * 0.5) * shake * 0.16;

    // ease camera toward target
    const ease = 0.10;
    camera.position.x += (targetX + shakeX - camera.position.x) * ease;
    camera.position.y += (targetY + shakeY - camera.position.y) * ease;
    camera.position.z += (targetZ - camera.position.z) * ease;
    camera.lookAt(midX * 0.4, 1.6, 0);

    const pc = camera as THREE.PerspectiveCamera;
    pc.fov += (targetFov - pc.fov) * 0.08;
    pc.updateProjectionMatrix();
  });

  return null;
}
