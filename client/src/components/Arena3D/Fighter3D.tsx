import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import WeaponMesh from "./WeaponMesh";
import AttackEffect from "./AttackEffect";

export type SpriteAction =
  | "idle" | "attack" | "hit" | "block" | "victory" | "defeat"
  | "punch" | "kick" | "weapon-strike" | "jump" | "slide";

interface CharacterConfig {
  bodyColor: string;
  armorColor: string;   // secondary armor plates
  accentColor: string;  // trim / glow
  helmColor: string;
  emissive: string;
  weapon?: "sword" | "daggers" | "fists" | "staff" | "flame-sword" | "ice-lance";
  bodyScale?: [number, number, number];
  rough: number;
  metal: number;
  hornLen: number;     // horn length (0 = no horns)
  hornSpread: number;  // horn outward angle
}

// Each character has a Ronin-Shadow-quality samurai aesthetic
const C: Record<string, CharacterConfig> = {
  ironclad: {
    bodyColor:  "#0f172a", armorColor: "#1e3a5f", accentColor: "#94a3b8",
    helmColor:  "#1e3a5f", emissive:   "#2563eb",
    weapon: "sword",     rough: 0.20, metal: 0.88,
    hornLen: 0.22,       hornSpread: 0.20,
  },
  shadowblade: {
    bodyColor:  "#0d0520", armorColor: "#2e1065", accentColor: "#c084fc",
    helmColor:  "#1a0a38", emissive:   "#7c3aed",
    weapon: "daggers",   rough: 0.35, metal: 0.55,
    hornLen: 0.34,       hornSpread: 0.32,
  },
  stoneforged: {
    bodyColor:  "#1c1917", armorColor: "#44403c", accentColor: "#f59e0b",
    helmColor:  "#292524", emissive:   "#78350f",
    weapon: "fists",     rough: 0.90, metal: 0.08,
    hornLen: 0.14,       hornSpread: 0.10,
    bodyScale:  [1.35, 1, 1.35],
  },
  voidwalker: {
    bodyColor:  "#0f0f23", armorColor: "#1e1b4b", accentColor: "#22d3ee",
    helmColor:  "#1e1b4b", emissive:   "#6d28d9",
    weapon: "staff",     rough: 0.50, metal: 0.35,
    hornLen: 0.30,       hornSpread: 0.12,
  },
  embercrest: {
    bodyColor:  "#1c0505", armorColor: "#7f1d1d", accentColor: "#f97316",
    helmColor:  "#450a0a", emissive:   "#dc2626",
    weapon: "flame-sword", rough: 0.40, metal: 0.55,
    hornLen: 0.30,       hornSpread: 0.42,
  },
  frostmantle: {
    bodyColor:  "#030d1a", armorColor: "#0c3050", accentColor: "#bae6fd",
    helmColor:  "#082f49", emissive:   "#0ea5e9",
    weapon: "ice-lance", rough: 0.18, metal: 0.72,
    hornLen: 0.26,       hornSpread: 0.18,
  },
};

const GOLD = "#c8a84b";

// Limb lengths
const U_ARM   = 0.44;
const FOREARM = 0.40;
const U_LEG   = 0.54;
const SHIN    = 0.46;

// Spring physics
interface Sp { pos: number; vel: number }
const mkSp = (v = 0): Sp => ({ pos: v, vel: 0 });
const sp = (s: Sp, target: number, k: number, d: number): number => {
  s.vel = (s.vel + (target - s.pos) * k) * d;
  s.pos += s.vel;
  return s.pos;
};

const eOut3 = (t: number) => 1 - Math.pow(1 - Math.min(1, t), 3);
const eIn2  = (t: number) => Math.min(1, t) ** 2;

export function Fighter3D({
  character,
  position,
  facingRight,
  action,
}: {
  character: string;
  position: [number, number, number];
  facingRight: boolean;
  action: SpriteAction;
}) {
  // Skeleton refs
  const rootRef      = useRef<THREE.Group>(null);
  const spineRef     = useRef<THREE.Group>(null);
  const torsoRef     = useRef<THREE.Group>(null);
  const headRef      = useRef<THREE.Group>(null);
  const rShoulderRef = useRef<THREE.Group>(null);
  const rElbowRef    = useRef<THREE.Group>(null);
  const lShoulderRef = useRef<THREE.Group>(null);
  const lElbowRef    = useRef<THREE.Group>(null);
  const rHipRef      = useRef<THREE.Group>(null);
  const rKneeRef     = useRef<THREE.Group>(null);
  const lHipRef      = useRef<THREE.Group>(null);
  const lKneeRef     = useRef<THREE.Group>(null);

  // Reactive glow refs
  const emblRef = useRef<THREE.Mesh>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);

  // Cape cloth refs (5 horizontal strips, waving in useFrame)
  const cape0 = useRef<THREE.Mesh>(null);
  const cape1 = useRef<THREE.Mesh>(null);
  const cape2 = useRef<THREE.Mesh>(null);
  const cape3 = useRef<THREE.Mesh>(null);
  const cape4 = useRef<THREE.Mesh>(null);

  // Ground energy footprint
  const footGlowRef = useRef<THREE.Mesh>(null);

  // Per-fighter dynamic accent light
  const accentLightRef = useRef<THREE.PointLight>(null);

  // Spring state
  const S = useRef({
    rSh_z: mkSp(-0.22), rSh_x: mkSp(),
    lSh_z: mkSp( 0.22), lSh_x: mkSp(),
    rEl_z: mkSp( 0.12), rEl_x: mkSp(),
    lEl_z: mkSp(-0.12), lEl_x: mkSp(),
    rHp_z: mkSp( 0.06), lHp_z: mkSp(-0.06),
    rKn_z: mkSp(),      lKn_z: mkSp(),
    spX: mkSp(), spZ: mkSp(), spY: mkSp(),
    toX: mkSp(), toY: mkSp(),
    hdX: mkSp(), hdZ: mkSp(),
    rtY: mkSp(), rtX: mkSp(),
  });

  const prevAction  = useRef(action);
  const actionStart = useRef(0);

  const cfg = C[character.toLowerCase()] ?? C.ironclad;

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    const t  = clock.elapsedTime;
    const ss = S.current;

    if (action !== prevAction.current) {
      prevAction.current = action;
      actionStart.current = t;
    }
    const elapsed = t - actionStart.current;

    rootRef.current.rotation.y = facingRight ? 0 : Math.PI;

    // Breathing overlay
    const breath = Math.sin(t * 0.72);

    // ── Reactive glow on emblem + eyes ──
    const isAttacking = ["punch","attack","kick","weapon-strike"].includes(action);
    const emblTarget  = isAttacking
      ? 2.2 + Math.sin(t * 12) * 0.8
      : 0.7 + Math.sin(t * 2.2) * 0.3;
    const eyeTarget = 2.5 + Math.sin(t * 3.8) * 0.5 + (isAttacking ? 1.5 : 0);
    if (emblRef.current)
      (emblRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emblTarget;
    if (eyeLRef.current)
      (eyeLRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeTarget;
    if (eyeRRef.current)
      (eyeRRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeTarget;

    // ── Joint targets ──
    let tRSz = -0.22, tRSx = 0;
    let tLSz =  0.22, tLSx = 0;
    let tREz =  0.12, tREx = 0;
    let tLEz = -0.12, tLEx = 0;
    let tRHz =  0.06, tLHz = -0.06;
    let tRKz = 0,     tLKz = 0;
    let tSpX = 0, tSpZ = 0, tSpY = 0;
    let tToX = 0, tToY = 0;
    let tHdX = 0, tHdZ = 0;
    let tRtY = position[1], tRtX = position[0];
    let K = 0.20, D = 0.80;

    switch (action) {
      case "idle": {
        const wt = Math.sin(t * 0.30);
        // Shadow Stance — slight forward lean, sword arm low, guard arm raised
        tRSz = -0.32 + wt * 0.05 + breath * 0.020;
        tLSz =  0.30 - wt * 0.05 - breath * 0.020;
        tREz =  0.18; // sword arm slightly extended
        tLEz = -0.35; // guard arm slightly bent
        tRHz =  0.06 + wt * 0.04; tLHz = -0.06 + wt * 0.04;
        tSpZ =  wt * 0.025;
        tToX = -0.06; // subtle forward lean
        tHdX =  Math.sin(t * 0.19) * 0.03;
        tHdZ =  Math.sin(t * 0.27) * 0.02;
        tRtY =  position[1] + Math.sin(t * 1.9) * 0.014 + breath * 0.005;
        K = 0.10; D = 0.87;
        break;
      }

      case "punch":
      case "attack": {
        if (elapsed < 0.09) {
          const p = eIn2(elapsed / 0.09);
          tRSz = -0.22 - p * 0.40; tREz = 0.12 + p * 0.45;
          tToX =  p * 0.06;        tSpY = -p * 0.08;
          tLSz =  0.5; tLEz = -0.6;
          K = 0.50; D = 0.70;
        } else if (elapsed < 0.30) {
          const p = eOut3((elapsed - 0.09) / 0.21);
          tRSz = -0.62 + p * 1.82; tREz = 0.57 - p * 0.67;
          tRSx = -0.18 * p;
          tLSz =  0.55; tLSx = -0.12; tLEz = -0.72;
          tToX =  0.06 - p * 0.20; tSpY = -0.08 + p * 0.22;
          K = 0.58; D = 0.62;
        } else {
          const p = eOut3(Math.min((elapsed - 0.30) / 0.35, 1));
          tRSz = 1.20 - p * 0.98; tREz = -0.10;
          tLSz =  0.55; tLEz = -0.70;
          tSpY =  0.14 - p * 0.14; tToX = -0.14 + p * 0.14;
          K = 0.22; D = 0.80;
        }
        break;
      }

      case "kick": {
        if (elapsed < 0.10) {
          const p = eIn2(elapsed / 0.10);
          tRHz =  0.06 - p * 0.30; tRKz = p * 0.28;
          tSpY =  p * 0.06; K = 0.45; D = 0.70;
        } else {
          const p = eOut3(Math.min((elapsed - 0.10) / 0.28, 1));
          tRHz = -0.24 + p * 1.62; tRKz =  0.28 - p * 0.78;
          tLHz = -0.10; tLKz = 0.12;
          tRSz = -0.55; tLSz = 0.72;
          tSpY =  0.06 - p * 0.14; tToX = -0.08;
          K = 0.52; D = 0.66;
        }
        break;
      }

      case "jump": {
        const jf = Math.abs(Math.sin(t * 3.2));
        tRHz =  0.52 * jf; tLHz =  0.52 * jf;
        tRKz = -0.72 * jf; tLKz = -0.72 * jf;
        tRSz = -0.42; tLSz = 0.42;
        tRSx = -0.15 * (1 - jf); tLSx = -0.15 * (1 - jf);
        tRtY =  position[1] + Math.abs(Math.sin(t * 3.2)) * 1.25;
        K = 0.28; D = 0.76;
        break;
      }

      case "slide": {
        const p = eOut3(Math.min(elapsed / 0.22, 1));
        tRHz =  0.50 * p; tLHz =  0.30 * p;
        tRKz = -0.68 * p; tLKz = -0.40 * p;
        tRSz =  0.38 * p; tLSz = -0.08;
        tToX = -0.45 * p; tSpX = -0.18 * p;
        tRtY =  position[1] - 0.34 * p;
        tRtX =  position[0] + (facingRight ? 1 : -1) * 0.38 * p;
        K = 0.42; D = 0.72;
        break;
      }

      case "weapon-strike": {
        const sw = Math.sin(t * 5.5);
        const p  = eOut3(Math.min(elapsed / 0.18, 1));
        tRSz = (0.60 + sw * 0.55) * p + -0.22 * (1 - p);
        tREz = (-0.10 + sw * 0.35) * p;
        tLSz =  0.38; tLEz = -0.52;
        tSpY =  sw * 0.20 * p; tToX = sw * 0.14 * p;
        K = 0.45; D = 0.70;
        break;
      }

      case "block": {
        const p = eOut3(Math.min(elapsed / 0.18, 1));
        tLSz = (0.22 + 0.85 * p); tLSx = -0.48 * p;
        tLEz = (-0.12 - 1.10 * p);
        tRSz = (0.22 + 0.36 * p); tRSx = -0.22 * p;
        tREz = (-0.12 - 0.55 * p);
        tToX =  0.12 * p;
        K = 0.38; D = 0.76;
        break;
      }

      case "hit": {
        const decay = Math.exp(-elapsed * 7.0);
        const osc   = Math.sin(elapsed * 20);
        tRSz = -0.65 + decay * osc * 0.35;
        tLSz =  0.65 - decay * osc * 0.30;
        tSpY =  decay * osc * 0.28;
        tToX =  decay * Math.abs(osc) * 0.32;
        tHdX = -decay * Math.abs(osc) * 0.22;
        rootRef.current.position.x =
          position[0] - (facingRight ? 1 : -1) * decay * Math.abs(osc) * 0.32;
        ss.rtX.pos = rootRef.current.position.x; ss.rtX.vel = 0;
        K = 0.62; D = 0.58;
        break;
      }

      case "victory": {
        const p      = eOut3(Math.min(elapsed / 0.40, 1));
        const bounce = Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.38;
        tRSz = -0.22 + p * 3.12; tLSz = 0.22 + p * 2.72;
        tREz = -0.28; tLEz = -0.28;
        tHdX =  Math.sin(t * 3.5) * 0.06;
        tSpY =  Math.sin(t * 2.2) * 0.06 * p;
        tRtY =  position[1] + bounce * p;
        K = 0.28; D = 0.76;
        break;
      }

      case "defeat": {
        const p = eOut3(Math.min(elapsed / 0.90, 1));
        tRSz =  0.72 * p; tLSz =  0.72 * p;
        tREz = -0.95 * p; tLEz = -0.95 * p;
        tRHz =  0.28 * p; tLHz =  0.28 * p;
        tRKz = -0.38 * p; tLKz = -0.38 * p;
        tToX =  0.58 * p; tSpX =  0.30 * p;
        tHdX = -0.35 * p;
        tRtY =  position[1] - 0.30 * p;
        K = 0.08; D = 0.92;
        break;
      }
    }

    tRSz += breath * 0.016; tLSz -= breath * 0.016;

    if (action !== "hit") {
      rootRef.current.position.y = sp(ss.rtY, tRtY, K * 0.55, D);
      rootRef.current.position.x = sp(ss.rtX, tRtX, K * 0.45, D * 0.96);
    } else {
      rootRef.current.position.y = sp(ss.rtY, tRtY, K * 0.55, D);
    }

    const js = (
      ref: { current: THREE.Group | null },
      sz: Sp, tz: number, sx: Sp, tx: number,
    ) => {
      if (!ref.current) return;
      ref.current.rotation.z = sp(sz, tz, K, D);
      ref.current.rotation.x = sp(sx, tx, K, D);
    };

    js(rShoulderRef, ss.rSh_z, tRSz, ss.rSh_x, tRSx);
    js(rElbowRef,    ss.rEl_z, tREz, ss.rEl_x, tREx);
    js(lShoulderRef, ss.lSh_z, tLSz, ss.lSh_x, tLSx);
    js(lElbowRef,    ss.lEl_z, tLEz, ss.lEl_x, tLEx);

    if (rHipRef.current)  rHipRef.current.rotation.z  = sp(ss.rHp_z, tRHz, K, D);
    if (lHipRef.current)  lHipRef.current.rotation.z  = sp(ss.lHp_z, tLHz, K, D);
    if (rKneeRef.current) rKneeRef.current.rotation.z = sp(ss.rKn_z, tRKz, K, D);
    if (lKneeRef.current) lKneeRef.current.rotation.z = sp(ss.lKn_z, tLKz, K, D);

    if (spineRef.current) {
      spineRef.current.rotation.x = sp(ss.spX, tSpX, K * 0.75, D);
      spineRef.current.rotation.z = sp(ss.spZ, tSpZ, K * 0.75, D);
      spineRef.current.rotation.y = sp(ss.spY, tSpY, K * 0.75, D);
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.x = sp(ss.toX, tToX, K * 0.70, D);
      torsoRef.current.rotation.y = sp(ss.toY, tToY, K * 0.70, D);
    }
    if (headRef.current) {
      headRef.current.rotation.x = sp(ss.hdX, tHdX + breath * 0.009, K * 0.50, D);
      headRef.current.rotation.z = sp(ss.hdZ, tHdZ, K * 0.50, D);
    }

    // ── Cape cloth simulation ──
    const capeRefs = [cape0, cape1, cape2, cape3, cape4];
    const capeSpd = isAttacking ? 4.0 : 2.0;
    const capeAmp = isAttacking ? 0.14 : 0.07;
    capeRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const phase = i * 0.52;
      const wave  = Math.sin(t * capeSpd + phase);
      ref.current.position.z = -0.24 - wave * capeAmp;
      ref.current.rotation.x = -0.06 + wave * 0.18;
    });

    // ── Ground footprint glow ──
    if (footGlowRef.current) {
      const fMat = footGlowRef.current.material as THREE.MeshStandardMaterial;
      const glowTarget = isAttacking ? 1.2 + Math.abs(Math.sin(t * 7)) * 0.8 : 0.30;
      fMat.emissiveIntensity += (glowTarget - fMat.emissiveIntensity) * 0.12;
      const s = isAttacking ? 1.0 + Math.abs(Math.sin(t * 8)) * 0.22 : 1.0;
      footGlowRef.current.scale.set(s, 1, s);
    }

    // ── Dynamic accent light intensity ──
    if (accentLightRef.current) {
      accentLightRef.current.intensity =
        isAttacking ? 1.4 + Math.sin(t * 10) * 0.4 : 0.7 + Math.sin(t * 2.5) * 0.2;
    }
  });

  // ── Material helpers ──
  const mat = (color: string, emissive = color, eInt = 0.15, r = cfg.rough, m = cfg.metal) => (
    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={eInt} roughness={r} metalness={m} />
  );
  const gold = (eInt = 0.3) => (
    <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={eInt} roughness={0.20} metalness={0.90} />
  );
  const ball = (r: number, color: string) => (
    <mesh>
      <sphereGeometry args={[r, 12, 8]} />
      <meshStandardMaterial color={color} roughness={cfg.rough * 0.6} metalness={Math.min(cfg.metal + 0.2, 1)} />
    </mesh>
  );
  const accent = (eInt = 0.4) => mat(cfg.accentColor, cfg.accentColor, eInt, cfg.rough * 0.6, Math.min(cfg.metal + 0.25, 1));

  const hornLen = cfg.hornLen;
  const hornSpr = cfg.hornSpread;

  return (
    <group ref={rootRef} position={position} castShadow>

      {/* Per-fighter dynamic accent point light */}
      <pointLight
        ref={accentLightRef}
        position={[0, 1.5, 0.4]}
        color={cfg.accentColor}
        intensity={0.7}
        distance={5}
      />

      {/* Ground energy footprint */}
      <mesh ref={footGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshStandardMaterial
          color={cfg.accentColor}
          emissive={cfg.accentColor}
          emissiveIntensity={0.30}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Slash arc VFX — triggered on attack actions */}
      <AttackEffect action={action} accentColor={cfg.accentColor} />

      {/* ══ SPINE CHAIN ══ */}
      <group ref={spineRef}>

        {/* ── Pelvis / hip block ── */}
        <mesh position={[0, 0.84, 0]}>
          <boxGeometry args={[0.54, 0.22, 0.34]} />
          {mat(cfg.armorColor)}
        </mesh>

        {/* Rope obi / belt */}
        <mesh position={[0, 0.97, 0]}>
          <cylinderGeometry args={[0.27, 0.29, 0.11, 16]} />
          {mat(cfg.accentColor, cfg.accentColor, 0.35, 0.85, 0.05)}
        </mesh>
        {/* Belt gold buckle ring */}
        <mesh position={[0, 0.97, 0.28]}>
          <torusGeometry args={[0.06, 0.018, 8, 16]} />
          {gold()}
        </mesh>

        {/* Armored skirt — front plate */}
        <mesh position={[0, 0.64, 0.20]}>
          <boxGeometry args={[0.42, 0.38, 0.06]} />
          {mat(cfg.armorColor, cfg.emissive, 0.06)}
        </mesh>
        {/* Skirt gold trim */}
        <mesh position={[0, 0.46, 0.21]}>
          <boxGeometry args={[0.38, 0.04, 0.04]} />
          {gold(0.5)}
        </mesh>
        {/* Skirt side plates */}
        <mesh position={[ 0.26, 0.64, 0.04]} rotation={[0, -0.55, 0]}>
          <boxGeometry args={[0.28, 0.36, 0.05]} />
          {mat(cfg.armorColor)}
        </mesh>
        <mesh position={[-0.26, 0.64, 0.04]} rotation={[0,  0.55, 0]}>
          <boxGeometry args={[0.28, 0.36, 0.05]} />
          {mat(cfg.armorColor)}
        </mesh>

        {/* Waist connector */}
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.14, 0.17, 0.18, 8]} />
          {mat(cfg.bodyColor)}
        </mesh>

        {/* ══ UPPER TORSO ══ */}
        <group ref={torsoRef}>

          {/* Chest */}
          <mesh position={[0, 1.35, 0]} scale={cfg.bodyScale ?? [1, 1, 1]} castShadow>
            <boxGeometry args={[0.72, 0.76, 0.42]} />
            {mat(cfg.bodyColor, cfg.emissive, 0.10)}
          </mesh>
          {/* Chest armor overlay */}
          <mesh position={[0, 1.38, 0.22]}>
            <boxGeometry args={[0.58, 0.60, 0.06]} />
            {mat(cfg.armorColor, cfg.emissive, 0.08)}
          </mesh>
          {/* Chest gold border */}
          <mesh position={[0, 1.38, 0.255]}>
            <boxGeometry args={[0.62, 0.64, 0.02]} />
            {gold(0.55)}
          </mesh>
          {/* Energy core — glowing sphere visible through chest gap */}
          <mesh position={[0, 1.44, 0.08]}>
            <sphereGeometry args={[0.10, 16, 12]} />
            <meshStandardMaterial
              color={cfg.accentColor}
              emissive={cfg.accentColor}
              emissiveIntensity={3.0}
              roughness={0.0}
              metalness={0.0}
              transparent
              opacity={0.90}
            />
          </mesh>
          {/* Glowing emblem — octagonal (reactive) */}
          <mesh ref={emblRef} position={[0, 1.44, 0.265]} rotation={[0, 0, Math.PI / 8]}>
            <cylinderGeometry args={[0.155, 0.155, 0.032, 8]} />
            <meshStandardMaterial
              color={cfg.accentColor}
              emissive={cfg.accentColor}
              emissiveIntensity={0.8}
              roughness={0.10}
              metalness={0.15}
            />
          </mesh>

          {/* ── Pauldrons ── */}
          {/* Right pauldron — main plate */}
          <mesh position={[0.50, 1.68, 0]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.24, 0.16, 0.36]} />
            {mat(cfg.armorColor, cfg.emissive, 0.06)}
          </mesh>
          <mesh position={[0.56, 1.76, 0]} rotation={[0, 0, 0.30]}>
            <boxGeometry args={[0.18, 0.08, 0.30]} />
            {mat(cfg.armorColor)}
          </mesh>
          {/* Right pauldron gold trim */}
          <mesh position={[0.56, 1.72, 0.16]} rotation={[0, 0, 0.28]}>
            <boxGeometry args={[0.14, 0.035, 0.04]} />
            {gold()}
          </mesh>
          {/* Left pauldron */}
          <mesh position={[-0.50, 1.68, 0]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.24, 0.16, 0.36]} />
            {mat(cfg.armorColor, cfg.emissive, 0.06)}
          </mesh>
          <mesh position={[-0.56, 1.76, 0]} rotation={[0, 0, -0.30]}>
            <boxGeometry args={[0.18, 0.08, 0.30]} />
            {mat(cfg.armorColor)}
          </mesh>
          <mesh position={[-0.56, 1.72, 0.16]} rotation={[0, 0, -0.28]}>
            <boxGeometry args={[0.14, 0.035, 0.04]} />
            {gold()}
          </mesh>

          {/* Neck */}
          <mesh position={[0, 1.83, 0]}>
            <cylinderGeometry args={[0.10, 0.13, 0.22, 8]} />
            {mat(cfg.helmColor)}
          </mesh>
          {/* Neck guard (gorget) */}
          <mesh position={[0, 1.80, 0]}>
            <cylinderGeometry args={[0.16, 0.19, 0.06, 12]} />
            {mat(cfg.armorColor, cfg.emissive, 0.05)}
          </mesh>

          {/* ══ HEAD / HELMET ══ */}
          <group ref={headRef} position={[0, 2.00, 0]}>
            {/* Skull */}
            <mesh>
              <boxGeometry args={[0.42, 0.42, 0.38]} />
              {mat(cfg.helmColor, cfg.emissive, 0.18)}
            </mesh>
            {/* Helmet top dome */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 0.10, 10]} />
              {mat(cfg.armorColor, cfg.emissive, 0.10)}
            </mesh>
            {/* Brow visor plate — angled forward */}
            <mesh position={[0, 0.13, 0.198]} rotation={[-0.18, 0, 0]}>
              <boxGeometry args={[0.42, 0.075, 0.082]} />
              {mat(cfg.armorColor, cfg.emissive, 0.14)}
            </mesh>
            {/* Visor gold trim */}
            <mesh position={[0, 0.13, 0.238]} rotation={[-0.18, 0, 0]}>
              <boxGeometry args={[0.40, 0.026, 0.02]} />
              {gold(0.7)}
            </mesh>
            {/* Visor glow slit — emissive accent strip below brow */}
            <mesh position={[0, 0.04, 0.202]}>
              <boxGeometry args={[0.34, 0.018, 0.015]} />
              <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={2.5} roughness={0.05} />
            </mesh>
            {/* Face mask (lower) */}
            <mesh position={[0, -0.10, 0.19]}>
              <boxGeometry args={[0.34, 0.18, 0.06]} />
              {mat(cfg.armorColor)}
            </mesh>
            {/* Jaw / chin */}
            <mesh position={[0, -0.20, 0.06]}>
              <boxGeometry args={[0.30, 0.09, 0.32]} />
              {mat(cfg.helmColor)}
            </mesh>
            {/* Side cheek guards */}
            <mesh position={[ 0.22, -0.04, 0.08]} rotation={[0, -0.3, 0]}>
              <boxGeometry args={[0.07, 0.28, 0.28]} />
              {mat(cfg.armorColor)}
            </mesh>
            <mesh position={[-0.22, -0.04, 0.08]} rotation={[0, 0.3, 0]}>
              <boxGeometry args={[0.07, 0.28, 0.28]} />
              {mat(cfg.armorColor)}
            </mesh>

            {/* Glowing eyes (reactive) */}
            <mesh ref={eyeLRef} position={[ 0.11, 0.06, 0.198]}>
              <sphereGeometry args={[0.068, 12, 8]} />
              <meshStandardMaterial
                color={cfg.accentColor}
                emissive={cfg.accentColor}
                emissiveIntensity={2.5}
                roughness={0.05}
                metalness={0.0}
              />
            </mesh>
            <mesh ref={eyeRRef} position={[-0.11, 0.06, 0.198]}>
              <sphereGeometry args={[0.068, 12, 8]} />
              <meshStandardMaterial
                color={cfg.accentColor}
                emissive={cfg.accentColor}
                emissiveIntensity={2.5}
                roughness={0.05}
                metalness={0.0}
              />
            </mesh>

            {/* Horns */}
            {hornLen > 0 && (
              <>
                <mesh
                  position={[ 0.16, 0.26,  0.02]}
                  rotation={[0.10, 0, -(0.35 + hornSpr)]}
                >
                  <cylinderGeometry args={[0.012, 0.045, hornLen, 6]} />
                  {gold(0.7)}
                </mesh>
                <mesh
                  position={[-0.16, 0.26,  0.02]}
                  rotation={[0.10, 0,  (0.35 + hornSpr)]}
                >
                  <cylinderGeometry args={[0.012, 0.045, hornLen, 6]} />
                  {gold(0.7)}
                </mesh>
              </>
            )}

            {/* Top crest knob */}
            <mesh position={[0, 0.30, 0]}>
              <sphereGeometry args={[0.06, 8, 6]} />
              {gold(0.6)}
            </mesh>
          </group>

          {/* ══ RIGHT ARM ══ */}
          <group ref={rShoulderRef} position={[0.44, 1.58, 0]}>
            {ball(0.112, cfg.armorColor)}
            <mesh position={[0, -U_ARM / 2, 0]}>
              <cylinderGeometry args={[0.080, 0.102, U_ARM, 8]} />
              {mat(cfg.bodyColor, cfg.emissive, 0.05)}
            </mesh>
            {/* Bicep plate */}
            <mesh position={[0, -U_ARM * 0.42, 0.098]}>
              <boxGeometry args={[0.15, 0.22, 0.078]} />
              {mat(cfg.armorColor, cfg.emissive, 0.07)}
            </mesh>
            <group ref={rElbowRef} position={[0, -U_ARM, 0]}>
              {ball(0.086, cfg.armorColor)}
              <mesh position={[0, -FOREARM / 2, 0]}>
                <cylinderGeometry args={[0.062, 0.080, FOREARM, 10]} />
                {mat(cfg.armorColor, cfg.accentColor, 0.06)}
              </mesh>
              {/* Energy conduit — glowing line along forearm */}
              <mesh position={[0.066, -FOREARM * 0.52, 0.040]}>
                <boxGeometry args={[0.014, FOREARM * 0.82, 0.014]} />
                <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={2.0} roughness={0.05} />
              </mesh>
              {/* Gauntlet plate */}
              <mesh position={[0, -FOREARM * 0.38, 0.092]}>
                <boxGeometry args={[0.13, 0.20, 0.07]} />
                {mat(cfg.armorColor, cfg.emissive, 0.08)}
              </mesh>
              <mesh position={[0, -FOREARM * 0.38, 0.128]}>
                <boxGeometry args={[0.11, 0.16, 0.02]} />
                {gold(0.5)}
              </mesh>
              <group position={[0, -FOREARM, 0]}>
                <mesh>
                  <boxGeometry args={[0.20, 0.18, 0.20]} />
                  {accent(0.35)}
                </mesh>
                <WeaponMesh type={cfg.weapon} accentColor={cfg.accentColor} side="right" />
              </group>
            </group>
          </group>

          {/* ══ LEFT ARM ══ */}
          <group ref={lShoulderRef} position={[-0.44, 1.58, 0]}>
            {ball(0.112, cfg.armorColor)}
            <mesh position={[0, -U_ARM / 2, 0]}>
              <cylinderGeometry args={[0.080, 0.102, U_ARM, 8]} />
              {mat(cfg.bodyColor, cfg.emissive, 0.05)}
            </mesh>
            {/* Bicep plate */}
            <mesh position={[0, -U_ARM * 0.42, 0.098]}>
              <boxGeometry args={[0.15, 0.22, 0.078]} />
              {mat(cfg.armorColor, cfg.emissive, 0.07)}
            </mesh>
            <group ref={lElbowRef} position={[0, -U_ARM, 0]}>
              {ball(0.086, cfg.armorColor)}
              <mesh position={[0, -FOREARM / 2, 0]}>
                <cylinderGeometry args={[0.062, 0.080, FOREARM, 10]} />
                {mat(cfg.armorColor, cfg.accentColor, 0.06)}
              </mesh>
              {/* Energy conduit — left forearm */}
              <mesh position={[-0.066, -FOREARM * 0.52, 0.040]}>
                <boxGeometry args={[0.014, FOREARM * 0.82, 0.014]} />
                <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={2.0} roughness={0.05} />
              </mesh>
              <mesh position={[0, -FOREARM * 0.38, 0.092]}>
                <boxGeometry args={[0.13, 0.20, 0.07]} />
                {mat(cfg.armorColor, cfg.emissive, 0.08)}
              </mesh>
              <mesh position={[0, -FOREARM * 0.38, 0.128]}>
                <boxGeometry args={[0.11, 0.16, 0.02]} />
                {gold(0.5)}
              </mesh>
              <group position={[0, -FOREARM, 0]}>
                <mesh>
                  <boxGeometry args={[0.20, 0.18, 0.20]} />
                  {accent(0.35)}
                </mesh>
                <WeaponMesh type={cfg.weapon} accentColor={cfg.accentColor} side="left" />
              </group>
            </group>
          </group>

          {/* ══ CAPE — 5 animated cloth strips ══ */}
          <mesh ref={cape0} position={[0, 1.72, -0.24]}>
            <boxGeometry args={[0.58, 0.10, 0.038]} />
            {mat(cfg.armorColor, cfg.emissive, 0.10, 0.75, 0.12)}
          </mesh>
          <mesh ref={cape1} position={[0, 1.60, -0.24]}>
            <boxGeometry args={[0.55, 0.10, 0.036]} />
            {mat(cfg.armorColor, cfg.emissive, 0.09, 0.78, 0.10)}
          </mesh>
          <mesh ref={cape2} position={[0, 1.48, -0.24]}>
            <boxGeometry args={[0.52, 0.10, 0.034]} />
            {mat(cfg.bodyColor,  cfg.emissive, 0.08, 0.80, 0.08)}
          </mesh>
          <mesh ref={cape3} position={[0, 1.36, -0.24]}>
            <boxGeometry args={[0.48, 0.10, 0.032]} />
            {mat(cfg.bodyColor,  cfg.emissive, 0.07, 0.82, 0.06)}
          </mesh>
          <mesh ref={cape4} position={[0, 1.24, -0.24]}>
            <boxGeometry args={[0.44, 0.10, 0.030]} />
            {mat(cfg.bodyColor,  cfg.emissive, 0.06, 0.84, 0.05)}
          </mesh>

          {/* Spine energy conduit — vertical glowing line down the back */}
          <mesh position={[0, 1.30, -0.215]}>
            <boxGeometry args={[0.018, 0.72, 0.018]} />
            <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={1.4} roughness={0.05} />
          </mesh>

        </group>{/* end torsoRef */}
      </group>{/* end spineRef */}

      {/* ══ RIGHT LEG ══ */}
      <group ref={rHipRef} position={[0.20, 0.76, 0]}>
        {ball(0.118, cfg.armorColor)}
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.096, 0.124, U_LEG, 8]} />
          {mat(cfg.bodyColor)}
        </mesh>
        {/* Thigh armor plate */}
        <mesh position={[0, -U_LEG * 0.38, 0.118]}>
          <boxGeometry args={[0.19, 0.28, 0.085]} />
          {mat(cfg.armorColor, cfg.emissive, 0.08)}
        </mesh>
        <mesh position={[0, -U_LEG * 0.38, 0.163]}>
          <boxGeometry args={[0.15, 0.22, 0.022]} />
          {gold(0.45)}
        </mesh>
        <group ref={rKneeRef} position={[0, -U_LEG, 0]}>
          {ball(0.098, cfg.armorColor)}
          {/* Knee guard */}
          <mesh position={[0, 0, 0.095]}>
            <boxGeometry args={[0.17, 0.15, 0.08]} />
            {mat(cfg.armorColor, cfg.emissive, 0.07)}
          </mesh>
          <mesh position={[0, 0, 0.136]}>
            <boxGeometry args={[0.13, 0.11, 0.025]} />
            {gold(0.55)}
          </mesh>
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.076, 0.096, SHIN, 10]} />
            {mat(cfg.armorColor, cfg.accentColor, 0.06)}
          </mesh>
          {/* Energy conduit — right shin */}
          <mesh position={[0.082, -SHIN * 0.52, 0.058]}>
            <boxGeometry args={[0.013, SHIN * 0.80, 0.013]} />
            <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={1.6} roughness={0.05} />
          </mesh>
          {/* Tall armored boot */}
          <mesh position={[0.025, -SHIN - 0.02, 0.06]}>
            <boxGeometry args={[0.24, 0.18, 0.34]} />
            {mat(cfg.armorColor, cfg.emissive, 0.07)}
          </mesh>
          {/* Boot toe cap */}
          <mesh position={[0.025, -SHIN - 0.08, 0.18]} rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[0.20, 0.09, 0.16]} />
            {mat(cfg.bodyColor)}
          </mesh>
          {/* Boot gold trim */}
          <mesh position={[0.025, -SHIN + 0.07, 0.09]}>
            <boxGeometry args={[0.22, 0.03, 0.36]} />
            {gold(0.5)}
          </mesh>
        </group>
      </group>

      {/* ══ LEFT LEG ══ */}
      <group ref={lHipRef} position={[-0.20, 0.76, 0]}>
        {ball(0.118, cfg.armorColor)}
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.096, 0.124, U_LEG, 8]} />
          {mat(cfg.bodyColor)}
        </mesh>
        {/* Thigh armor plate */}
        <mesh position={[0, -U_LEG * 0.38, 0.118]}>
          <boxGeometry args={[0.19, 0.28, 0.085]} />
          {mat(cfg.armorColor, cfg.emissive, 0.08)}
        </mesh>
        <mesh position={[0, -U_LEG * 0.38, 0.163]}>
          <boxGeometry args={[0.15, 0.22, 0.022]} />
          {gold(0.45)}
        </mesh>
        <group ref={lKneeRef} position={[0, -U_LEG, 0]}>
          {ball(0.098, cfg.armorColor)}
          <mesh position={[0, 0, 0.095]}>
            <boxGeometry args={[0.17, 0.15, 0.08]} />
            {mat(cfg.armorColor, cfg.emissive, 0.07)}
          </mesh>
          <mesh position={[0, 0, 0.136]}>
            <boxGeometry args={[0.13, 0.11, 0.025]} />
            {gold(0.55)}
          </mesh>
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.076, 0.096, SHIN, 10]} />
            {mat(cfg.armorColor, cfg.accentColor, 0.06)}
          </mesh>
          {/* Energy conduit — left shin */}
          <mesh position={[-0.082, -SHIN * 0.52, 0.058]}>
            <boxGeometry args={[0.013, SHIN * 0.80, 0.013]} />
            <meshStandardMaterial color={cfg.accentColor} emissive={cfg.accentColor} emissiveIntensity={1.6} roughness={0.05} />
          </mesh>
          <mesh position={[-0.025, -SHIN - 0.02, 0.06]}>
            <boxGeometry args={[0.24, 0.18, 0.34]} />
            {mat(cfg.armorColor, cfg.emissive, 0.07)}
          </mesh>
          <mesh position={[-0.025, -SHIN - 0.08, 0.18]} rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[0.20, 0.09, 0.16]} />
            {mat(cfg.bodyColor)}
          </mesh>
          <mesh position={[-0.025, -SHIN + 0.07, 0.09]}>
            <boxGeometry args={[0.22, 0.03, 0.36]} />
            {gold(0.5)}
          </mesh>
        </group>
      </group>

    </group>
  );
}

export default Fighter3D;
