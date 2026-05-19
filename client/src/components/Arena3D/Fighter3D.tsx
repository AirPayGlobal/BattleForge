import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import WeaponMesh from "./WeaponMesh";

export type SpriteAction =
  | "idle" | "attack" | "hit" | "block" | "victory" | "defeat"
  | "punch" | "kick" | "weapon-strike" | "jump" | "slide";

interface CharacterConfig {
  bodyColor: string;
  accentColor: string;
  headColor: string;
  emissive: string;
  weapon?: "sword" | "daggers" | "fists" | "staff" | "flame-sword" | "ice-lance";
  bodyScale?: [number, number, number];
  rough?: number;
  metal?: number;
}

const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
  ironclad:    { bodyColor: "#1e40af", accentColor: "#d4d4d4", headColor: "#374151", emissive: "#1d4ed8", weapon: "sword",       rough: 0.35, metal: 0.75 },
  shadowblade: { bodyColor: "#3b0764", accentColor: "#e879f9", headColor: "#1a0a2e", emissive: "#7c3aed", weapon: "daggers",     rough: 0.55, metal: 0.3  },
  stoneforged: { bodyColor: "#44403c", accentColor: "#d97706", headColor: "#292524", emissive: "#292524", weapon: "fists", bodyScale: [1.35, 1, 1.35], rough: 0.8, metal: 0.1 },
  voidwalker:  { bodyColor: "#2e1065", accentColor: "#22d3ee", headColor: "#4c1d95", emissive: "#6d28d9", weapon: "staff",       rough: 0.6, metal: 0.2  },
  embercrest:  { bodyColor: "#7f1d1d", accentColor: "#fb923c", headColor: "#450a0a", emissive: "#dc2626", weapon: "flame-sword", rough: 0.45, metal: 0.5  },
  frostmantle: { bodyColor: "#0c4a6e", accentColor: "#bae6fd", headColor: "#082f49", emissive: "#0369a1", weapon: "ice-lance",   rough: 0.3, metal: 0.6  },
};

// Limb segment lengths
const U_ARM   = 0.44;
const FOREARM = 0.40;
const U_LEG   = 0.54;
const SHIN    = 0.46;

// Spring state
interface Sp { pos: number; vel: number }
const mkSp = (v = 0): Sp => ({ pos: v, vel: 0 });
const stepSp = (s: Sp, target: number, k: number, d: number): number => {
  s.vel = (s.vel + (target - s.pos) * k) * d;
  s.pos += s.vel;
  return s.pos;
};

// Easing helpers
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

  // All spring states (stable across renders)
  const S = useRef({
    rSh_z: mkSp(-0.22), rSh_x: mkSp(),
    lSh_z: mkSp( 0.22), lSh_x: mkSp(),
    rEl_z: mkSp( 0.12), rEl_x: mkSp(),
    lEl_z: mkSp(-0.12), lEl_x: mkSp(),
    rHp_z: mkSp( 0.06),
    lHp_z: mkSp(-0.06),
    rKn_z: mkSp(),
    lKn_z: mkSp(),
    sp_x:  mkSp(), sp_z: mkSp(), sp_y: mkSp(), // lower spine
    to_x:  mkSp(), to_y: mkSp(),               // upper torso
    hd_x:  mkSp(), hd_z: mkSp(),               // head
    rtY:   mkSp(), rtX:  mkSp(),               // root position
  });

  const prevAction   = useRef(action);
  const actionStart  = useRef(0);

  const config = CHARACTER_CONFIGS[character.toLowerCase()] ?? CHARACTER_CONFIGS.ironclad;
  const rough  = config.rough  ?? 0.5;
  const metal  = config.metal  ?? 0.4;

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    const t   = clock.elapsedTime;
    const ss  = S.current;

    if (action !== prevAction.current) {
      prevAction.current = action;
      actionStart.current = t;
    }
    const elapsed = t - actionStart.current;

    rootRef.current.rotation.y = facingRight ? 0 : Math.PI;

    // Breathing — slow sine, always active
    const breath = Math.sin(t * 0.72); // ~8.7s cycle

    // Default neutral pose targets
    let tRSz = -0.22, tRSx = 0;
    let tLSz =  0.22, tLSx = 0;
    let tREz =  0.12, tREx = 0;
    let tLEz = -0.12, tLEx = 0;
    let tRHz =  0.06;
    let tLHz = -0.06;
    let tRKz = 0, tLKz = 0;
    let tSpX = 0, tSpZ = 0, tSpY = 0;
    let tToX = 0, tToY = 0;
    let tHdX = 0, tHdZ = 0;
    let tRtY = position[1];
    let tRtX = position[0];
    // Spring params [stiffness, damping]
    let K = 0.20, D = 0.80;

    switch (action) {
      case "idle": {
        // Slow weight-shift side to side + breathing shoulder rise
        const wt = Math.sin(t * 0.30); // ~21s full cycle
        tRSz = -0.22 + wt * 0.05 + breath * 0.025;
        tLSz =  0.22 + wt * 0.05 - breath * 0.025;
        tRHz = 0.06 + wt * 0.04;
        tLHz = -0.06 + wt * 0.04;
        tSpZ = wt * 0.025;             // hip tilt with weight
        tHdX = Math.sin(t * 0.19) * 0.04; // subtle head micro-movement
        tHdZ = Math.sin(t * 0.27) * 0.025;
        tRtY = position[1] + Math.sin(t * 1.9) * 0.016 + breath * 0.006;
        K = 0.10; D = 0.87;
        break;
      }

      case "punch":
      case "attack": {
        if (elapsed < 0.09) {
          // ANTICIPATION — pull shoulder back, load energy
          const p = eIn2(elapsed / 0.09);
          tRSz = -0.22 - p * 0.40;
          tREz =  0.12 + p * 0.45;
          tToX =  p * 0.06;          // slight lean back
          tSpY = -p * 0.08;          // spine rotates back (loading)
          tLSz =  0.5;  tLEz = -0.6; // guard raises during windup
          K = 0.50; D = 0.70;
        } else if (elapsed < 0.30) {
          // DRIVE — explode forward
          const p = eOut3((elapsed - 0.09) / 0.21);
          tRSz = -0.62 + p * 1.82;  // from pullback → full extension
          tREz =  0.57 - p * 0.67;  // forearm snaps straight
          tRSx = -0.18 * p;
          tLSz =  0.55; tLSx = -0.12;
          tLEz = -0.72;
          tToX =  0.06 - p * 0.20;  // drives forward
          tSpY = -0.08 + p * 0.22;  // spine drives into punch
          K = 0.58; D = 0.62;       // very snappy — Unreal feel
        } else {
          // RECOVER to fighting guard
          const p = eOut3(Math.min((elapsed - 0.30) / 0.35, 1));
          tRSz = 1.20 - p * 0.98;   // returns from extension to guard
          tREz = -0.10;
          tLSz =  0.55; tLEz = -0.70;
          tSpY =  0.14 - p * 0.14;
          tToX = -0.14 + p * 0.14;
          K = 0.22; D = 0.80;
        }
        break;
      }

      case "kick": {
        if (elapsed < 0.10) {
          // WINDUP — pull leg back
          const p = eIn2(elapsed / 0.10);
          tRHz =  0.06 - p * 0.30;
          tRKz =  p * 0.28;
          tSpY =  p * 0.06;
          K = 0.45; D = 0.70;
        } else {
          // DRIVE — snap through
          const p = eOut3(Math.min((elapsed - 0.10) / 0.28, 1));
          tRHz = -0.24 + p * 1.62;  // leg rockets forward
          tRKz =  0.28 - p * 0.78;  // knee snaps through
          tLHz = -0.10; tLKz = 0.12; // plant leg absorbs
          tRSz = -0.55;
          tLSz =  0.72;
          tSpY =  0.06 - p * 0.14;
          tToX = -0.08;
          K = 0.52; D = 0.66;
        }
        break;
      }

      case "jump": {
        const jf = Math.abs(Math.sin(t * 3.2));
        tRHz =  0.52 * jf;  tLHz =  0.52 * jf;
        tRKz = -0.72 * jf;  tLKz = -0.72 * jf;
        tRSz = -0.42 + jf * 0.12;
        tLSz =  0.42 - jf * 0.12;
        // Arms flare outward at peak (low jf = peak)
        tRSx = -0.15 * (1 - jf);
        tLSx = -0.15 * (1 - jf);
        tRtY = position[1] + Math.abs(Math.sin(t * 3.2)) * 1.25;
        K = 0.28; D = 0.76;
        break;
      }

      case "slide": {
        const p = eOut3(Math.min(elapsed / 0.22, 1));
        tRHz =  0.50 * p;  tLHz =  0.30 * p;
        tRKz = -0.68 * p;  tLKz = -0.40 * p;
        tRSz =  0.38 * p;  tLSz = -0.08;
        tToX = -0.45 * p;  tSpX = -0.18 * p;
        tRtY = position[1] - 0.34 * p;
        tRtX = position[0] + (facingRight ? 1 : -1) * 0.38 * p;
        K = 0.42; D = 0.72;
        break;
      }

      case "weapon-strike": {
        const sw = Math.sin(t * 5.5);
        const p  = eOut3(Math.min(elapsed / 0.18, 1));
        tRSz = (0.60 + sw * 0.55) * p + -0.22 * (1 - p);
        tREz = (-0.10 + sw * 0.35) * p;
        tLSz =  0.38; tLEz = -0.52;
        tSpY =  sw * 0.20 * p;
        tToX =  sw * 0.14 * p;
        K = 0.45; D = 0.70;
        break;
      }

      case "block": {
        const p = eOut3(Math.min(elapsed / 0.18, 1));
        tLSz = (0.22 + 0.85 * p);  tLSx = -0.48 * p;
        tLEz = (-0.12 - 1.10 * p); tLEx = 0;
        tRSz = (0.22 + 0.36 * p);  tRSx = -0.22 * p;
        tREz = (-0.12 - 0.55 * p);
        tToX =  0.12 * p; // slight backward lean
        K = 0.38; D = 0.76;
        break;
      }

      case "hit": {
        // Decaying oscillation — ragdoll-like recoil
        const decay = Math.exp(-elapsed * 7.0);
        const osc   = Math.sin(elapsed * 20);
        tRSz = -0.65 + decay * osc * 0.35;
        tLSz =  0.65 - decay * osc * 0.30;
        tSpY =  decay * osc * 0.28;
        tToX =  decay * Math.abs(osc) * 0.32;
        tHdX = -decay * Math.abs(osc) * 0.22; // head snaps back
        // Direct X position for immediate feel, then spring catches up
        rootRef.current.position.x =
          position[0] - (facingRight ? 1 : -1) * decay * Math.abs(osc) * 0.32;
        ss.rtX.pos = rootRef.current.position.x;
        ss.rtX.vel = 0;
        K = 0.62; D = 0.58;
        break;
      }

      case "victory": {
        const p      = eOut3(Math.min(elapsed / 0.40, 1));
        const bounce = Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.38;
        tRSz = -0.22 + p * 3.12;  // both arms shoot skyward
        tLSz =  0.22 + p * 2.72;
        tREz = -0.28; tLEz = -0.28;
        tHdX = Math.sin(t * 3.5) * 0.06;
        tSpY =  Math.sin(t * 2.2) * 0.06 * p; // subtle shimmy
        tRtY = position[1] + bounce * p;
        K = 0.28; D = 0.76;
        break;
      }

      case "defeat": {
        const p = eOut3(Math.min(elapsed / 0.90, 1));
        tRSz =  0.72 * p;  tLSz =  0.72 * p;
        tREz = -0.95 * p;  tLEz = -0.95 * p;
        tRHz =  0.28 * p;  tLHz =  0.28 * p;
        tRKz = -0.38 * p;  tLKz = -0.38 * p;
        tToX =  0.58 * p;  tSpX =  0.30 * p;
        tHdX = -0.35 * p;  // head droops
        tRtY = position[1] - 0.30 * p;
        K = 0.08; D = 0.92; // slow, heavy, defeated
        break;
      }
    }

    // Breathing overlay on shoulders (all states)
    tRSz += breath * 0.018;
    tLSz -= breath * 0.018;

    // Root position
    if (action !== "hit") {
      rootRef.current.position.y = stepSp(ss.rtY, tRtY, K * 0.55, D);
      rootRef.current.position.x = stepSp(ss.rtX, tRtX, K * 0.45, D * 0.96);
    } else {
      rootRef.current.position.y = stepSp(ss.rtY, tRtY, K * 0.55, D);
    }

    // Joint helper
    const js = (
      ref: { current: THREE.Group | null },
      sz: Sp, tz: number,
      sx: Sp, tx: number,
    ) => {
      if (!ref.current) return;
      ref.current.rotation.z = stepSp(sz, tz, K, D);
      ref.current.rotation.x = stepSp(sx, tx, K, D);
    };

    js(rShoulderRef, ss.rSh_z, tRSz, ss.rSh_x, tRSx);
    js(rElbowRef,    ss.rEl_z, tREz, ss.rEl_x, tREx);
    js(lShoulderRef, ss.lSh_z, tLSz, ss.lSh_x, tLSx);
    js(lElbowRef,    ss.lEl_z, tLEz, ss.lEl_x, tLEx);

    if (rHipRef.current)  rHipRef.current.rotation.z  = stepSp(ss.rHp_z, tRHz, K, D);
    if (lHipRef.current)  lHipRef.current.rotation.z  = stepSp(ss.lHp_z, tLHz, K, D);
    if (rKneeRef.current) rKneeRef.current.rotation.z = stepSp(ss.rKn_z, tRKz, K, D);
    if (lKneeRef.current) lKneeRef.current.rotation.z = stepSp(ss.lKn_z, tLKz, K, D);

    if (spineRef.current) {
      spineRef.current.rotation.x = stepSp(ss.sp_x, tSpX, K * 0.75, D);
      spineRef.current.rotation.z = stepSp(ss.sp_z, tSpZ, K * 0.75, D);
      spineRef.current.rotation.y = stepSp(ss.sp_y, tSpY, K * 0.75, D);
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.x = stepSp(ss.to_x, tToX, K * 0.70, D);
      torsoRef.current.rotation.y = stepSp(ss.to_y, tToY, K * 0.70, D);
    }
    if (headRef.current) {
      headRef.current.rotation.x = stepSp(ss.hd_x, tHdX + breath * 0.010, K * 0.50, D);
      headRef.current.rotation.z = stepSp(ss.hd_z, tHdZ, K * 0.50, D);
    }
  });

  // Material shorthand
  const mat = (color: string, emissive?: string, eInt = 0.2, r = rough, m = metal) => (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={eInt}
      roughness={r}
      metalness={m}
    />
  );

  // Sphere at a joint — gives articulated, rigged look
  const ball = (r: number, color: string) => (
    <mesh>
      <sphereGeometry args={[r, 12, 8]} />
      <meshStandardMaterial color={color} roughness={rough * 0.7} metalness={Math.min(metal + 0.2, 1)} />
    </mesh>
  );

  return (
    <group ref={rootRef} position={position} castShadow>

      {/* ── Lower spine: carries upper body + tilt for weight shifts ── */}
      <group ref={spineRef}>

        {/* Hip / pelvis block */}
        <mesh position={[0, 0.84, 0]}>
          <boxGeometry args={[0.52, 0.24, 0.34]} />
          {mat(config.bodyColor)}
        </mesh>
        {/* Spine connector (waist) */}
        <mesh position={[0, 1.02, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.20, 8]} />
          {mat(config.bodyColor)}
        </mesh>

        {/* ── Upper torso: lean forward/back independently ── */}
        <group ref={torsoRef}>

          {/* Chest */}
          <mesh position={[0, 1.34, 0]} scale={config.bodyScale ?? [1, 1, 1]} castShadow>
            <boxGeometry args={[0.72, 0.78, 0.42]} />
            {mat(config.bodyColor, config.emissive, 0.14)}
          </mesh>
          {/* Chest armor plate */}
          <mesh position={[0, 1.44, 0.22]}>
            <boxGeometry args={[0.34, 0.34, 0.07]} />
            {mat(config.accentColor, config.accentColor, 0.55, 0.35, Math.min(metal + 0.3, 1))}
          </mesh>
          {/* Shoulder pads */}
          <mesh position={[ 0.46, 1.64, 0]}>
            <boxGeometry args={[0.18, 0.13, 0.30]} />
            {mat(config.accentColor, config.accentColor, 0.28, 0.4, Math.min(metal + 0.2, 1))}
          </mesh>
          <mesh position={[-0.46, 1.64, 0]}>
            <boxGeometry args={[0.18, 0.13, 0.30]} />
            {mat(config.accentColor, config.accentColor, 0.28, 0.4, Math.min(metal + 0.2, 1))}
          </mesh>

          {/* Neck */}
          <mesh position={[0, 1.82, 0]}>
            <cylinderGeometry args={[0.09, 0.13, 0.24, 8]} />
            {mat(config.headColor)}
          </mesh>

          {/* ── Head ── */}
          <group ref={headRef} position={[0, 1.99, 0]}>
            {/* Skull */}
            <mesh>
              <boxGeometry args={[0.42, 0.44, 0.38]} />
              {mat(config.headColor, config.emissive, 0.22)}
            </mesh>
            {/* Brow ridge */}
            <mesh position={[0, 0.13, 0.185]}>
              <boxGeometry args={[0.35, 0.08, 0.09]} />
              {mat(config.headColor, config.emissive, 0.18)}
            </mesh>
            {/* Jaw / chin */}
            <mesh position={[0, -0.17, 0.06]}>
              <boxGeometry args={[0.30, 0.10, 0.33]} />
              {mat(config.headColor)}
            </mesh>
            {/* Eyes */}
            <mesh position={[ 0.115, 0.08, 0.195]}>
              <sphereGeometry args={[0.068, 12, 8]} />
              <meshStandardMaterial
                emissive={config.accentColor}
                emissiveIntensity={2.8}
                color={config.accentColor}
                roughness={0.1}
                metalness={0.0}
              />
            </mesh>
            <mesh position={[-0.115, 0.08, 0.195]}>
              <sphereGeometry args={[0.068, 12, 8]} />
              <meshStandardMaterial
                emissive={config.accentColor}
                emissiveIntensity={2.8}
                color={config.accentColor}
                roughness={0.1}
                metalness={0.0}
              />
            </mesh>
          </group>

          {/* ── Right arm ── */}
          <group ref={rShoulderRef} position={[0.44, 1.58, 0]}>
            {ball(0.115, config.bodyColor)}
            {/* Upper arm — wider at shoulder, tapers to elbow */}
            <mesh position={[0, -U_ARM / 2, 0]}>
              <cylinderGeometry args={[0.082, 0.105, U_ARM, 8]} />
              {mat(config.bodyColor, config.emissive, 0.06)}
            </mesh>
            <group ref={rElbowRef} position={[0, -U_ARM, 0]}>
              {ball(0.088, config.accentColor)}
              {/* Forearm — tapers to wrist */}
              <mesh position={[0, -FOREARM / 2, 0]}>
                <cylinderGeometry args={[0.063, 0.082, FOREARM, 8]} />
                {mat(config.accentColor, config.accentColor, 0.10, rough * 0.8, Math.min(metal + 0.15, 1))}
              </mesh>
              <group position={[0, -FOREARM, 0]}>
                <mesh>
                  <boxGeometry args={[0.20, 0.18, 0.20]} />
                  {mat(config.accentColor, config.accentColor, 0.32, 0.38, Math.min(metal + 0.2, 1))}
                </mesh>
                <WeaponMesh type={config.weapon} accentColor={config.accentColor} side="right" />
              </group>
            </group>
          </group>

          {/* ── Left arm ── */}
          <group ref={lShoulderRef} position={[-0.44, 1.58, 0]}>
            {ball(0.115, config.bodyColor)}
            <mesh position={[0, -U_ARM / 2, 0]}>
              <cylinderGeometry args={[0.082, 0.105, U_ARM, 8]} />
              {mat(config.bodyColor, config.emissive, 0.06)}
            </mesh>
            <group ref={lElbowRef} position={[0, -U_ARM, 0]}>
              {ball(0.088, config.accentColor)}
              <mesh position={[0, -FOREARM / 2, 0]}>
                <cylinderGeometry args={[0.063, 0.082, FOREARM, 8]} />
                {mat(config.accentColor, config.accentColor, 0.10, rough * 0.8, Math.min(metal + 0.15, 1))}
              </mesh>
              <group position={[0, -FOREARM, 0]}>
                <mesh>
                  <boxGeometry args={[0.20, 0.18, 0.20]} />
                  {mat(config.accentColor, config.accentColor, 0.32, 0.38, Math.min(metal + 0.2, 1))}
                </mesh>
                <WeaponMesh type={config.weapon} accentColor={config.accentColor} side="left" />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ── Right leg ── */}
      <group ref={rHipRef} position={[0.20, 0.76, 0]}>
        {ball(0.120, config.bodyColor)}
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.098, 0.128, U_LEG, 8]} />
          {mat(config.bodyColor)}
        </mesh>
        <group ref={rKneeRef} position={[0, -U_LEG, 0]}>
          {ball(0.100, config.accentColor)}
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.078, 0.098, SHIN, 8]} />
            {mat(config.accentColor, config.accentColor, 0.08)}
          </mesh>
          {/* Boot */}
          <mesh position={[0.025, -SHIN - 0.04, 0.085]}>
            <boxGeometry args={[0.24, 0.13, 0.36]} />
            {mat(config.accentColor, config.accentColor, 0.18, 0.38, Math.min(metal + 0.2, 1))}
          </mesh>
        </group>
      </group>

      {/* ── Left leg ── */}
      <group ref={lHipRef} position={[-0.20, 0.76, 0]}>
        {ball(0.120, config.bodyColor)}
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.098, 0.128, U_LEG, 8]} />
          {mat(config.bodyColor)}
        </mesh>
        <group ref={lKneeRef} position={[0, -U_LEG, 0]}>
          {ball(0.100, config.accentColor)}
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.078, 0.098, SHIN, 8]} />
            {mat(config.accentColor, config.accentColor, 0.08)}
          </mesh>
          <mesh position={[-0.025, -SHIN - 0.04, 0.085]}>
            <boxGeometry args={[0.24, 0.13, 0.36]} />
            {mat(config.accentColor, config.accentColor, 0.18, 0.38, Math.min(metal + 0.2, 1))}
          </mesh>
        </group>
      </group>

    </group>
  );
}

export default Fighter3D;
