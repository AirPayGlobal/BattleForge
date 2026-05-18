import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import WeaponMesh from "./WeaponMesh";

export type SpriteAction =
  | "idle"
  | "attack"
  | "hit"
  | "block"
  | "victory"
  | "defeat"
  | "punch"
  | "kick"
  | "weapon-strike"
  | "jump"
  | "slide";

interface CharacterConfig {
  bodyColor: string;
  accentColor: string;
  headColor: string;
  emissive: string;
  weapon?: "sword" | "daggers" | "fists" | "staff" | "flame-sword" | "ice-lance";
  bodyScale?: [number, number, number];
}

const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
  ironclad:    { bodyColor: "#2563eb", accentColor: "#c0c0c0", headColor: "#374151", emissive: "#1d4ed8", weapon: "sword" },
  shadowblade: { bodyColor: "#4c1d95", accentColor: "#e879f9", headColor: "#1a0a2e", emissive: "#6b21a8", weapon: "daggers" },
  stoneforged: { bodyColor: "#57534e", accentColor: "#d97706", headColor: "#44403c", emissive: "#292524", weapon: "fists", bodyScale: [1.4, 1, 1.4] },
  voidwalker:  { bodyColor: "#3b0764", accentColor: "#06b6d4", headColor: "#4c1d95", emissive: "#4c1d95", weapon: "staff" },
  embercrest:  { bodyColor: "#991b1b", accentColor: "#f97316", headColor: "#7f1d1d", emissive: "#dc2626", weapon: "flame-sword" },
  frostmantle: { bodyColor: "#0c4a6e", accentColor: "#bae6fd", headColor: "#0369a1", emissive: "#0284c7", weapon: "ice-lance" },
};

// Limb segment lengths
const U_ARM   = 0.44;  // upper arm
const FOREARM = 0.38;  // forearm
const U_LEG   = 0.52;  // thigh
const SHIN    = 0.44;  // shin

type JointTarget = { z: number; x?: number };

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
  const torsoRef     = useRef<THREE.Group>(null);
  const rShoulderRef = useRef<THREE.Group>(null);
  const rElbowRef    = useRef<THREE.Group>(null);
  const lShoulderRef = useRef<THREE.Group>(null);
  const lElbowRef    = useRef<THREE.Group>(null);
  const rHipRef      = useRef<THREE.Group>(null);
  const rKneeRef     = useRef<THREE.Group>(null);
  const lHipRef      = useRef<THREE.Group>(null);
  const lKneeRef     = useRef<THREE.Group>(null);

  const config = CHARACTER_CONFIGS[character.toLowerCase()] ?? CHARACTER_CONFIGS.ironclad;

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    const t = clock.elapsedTime;
    const LERP = 0.14;

    rootRef.current.rotation.y = facingRight ? 0 : Math.PI;

    // Joint rotation targets.
    // z > 0  →  limb tip swings toward +X (forward for right-facing fighter)
    // x < 0  →  limb tip swings toward +Z (toward camera)
    let tRS: JointTarget = { z: -0.2, x: 0 };  // right shoulder
    let tRE: JointTarget = { z:  0.1 };         // right elbow
    let tLS: JointTarget = { z:  0.2, x: 0 };  // left shoulder
    let tLE: JointTarget = { z: -0.1 };         // left elbow
    let tRH: JointTarget = { z:  0.05 };        // right hip
    let tRK: JointTarget = { z:  0.0 };         // right knee
    let tLH: JointTarget = { z: -0.05 };        // left hip
    let tLK: JointTarget = { z:  0.0 };         // left knee
    let tTorsoX = 0;
    let rootY = position[1];

    switch (action) {
      case "idle": {
        const s = Math.sin(t * 1.5);
        tRS = { z: -0.2 + s * 0.06, x: 0 };
        tLS = { z:  0.2 - s * 0.06, x: 0 };
        tRH = { z:  s * 0.04 };
        tLH = { z: -s * 0.04 };
        rootY = position[1] + s * 0.03;
        break;
      }

      case "punch":
      case "attack": {
        tRS = { z: 1.15, x: -0.15 };
        tRE = { z: -0.1 };
        tLS = { z: 0.55, x: -0.1 };
        tLE = { z: -0.7 };
        tTorsoX = -0.12;
        break;
      }

      case "kick": {
        tRH = { z: 1.35 };
        tRK = { z: -0.45 };
        tLH = { z: -0.08 };
        tRS = { z: -0.5 };
        tLS = { z:  0.65 };
        tTorsoX = -0.08;
        break;
      }

      case "jump": {
        const jf = Math.abs(Math.sin(t * 3));
        tRH = { z: 0.55 * jf };
        tLH = { z: 0.55 * jf };
        tRK = { z: -0.75 * jf };
        tLK = { z: -0.75 * jf };
        tRS = { z: -0.4 };
        tLS = { z:  0.4 };
        rootY = position[1] + Math.abs(Math.sin(t * 3)) * 1.2;
        break;
      }

      case "slide": {
        tRH = { z: 0.48 };
        tLH = { z: 0.28 };
        tRK = { z: -0.65 };
        tLK = { z: -0.38 };
        tRS = { z: 0.35 };
        tLS = { z: -0.1 };
        tTorsoX = -0.42;
        rootY = position[1] - 0.32;
        break;
      }

      case "weapon-strike": {
        const sw = Math.sin(t * 5);
        tRS = { z: 0.85 + sw * 0.5, x: -0.1 };
        tRE = { z: -0.15 + sw * 0.3 };
        tLS = { z: 0.35 };
        tLE = { z: -0.5 };
        tTorsoX = sw * 0.15;
        break;
      }

      case "block": {
        tLS = { z: 1.05, x: -0.45 };
        tLE = { z: -1.2 };
        tRS = { z: 0.55, x: -0.2 };
        tRE = { z: -0.65 };
        break;
      }

      case "hit": {
        tRS = { z: -0.5, x: 0 };
        tLS = { z:  0.5, x: 0 };
        tTorsoX = Math.sin(t * 12) * 0.2;
        rootRef.current.position.x =
          position[0] - (facingRight ? 1 : -1) * Math.abs(Math.sin(t * 14)) * 0.28;
        break;
      }

      case "victory": {
        tRS = { z: 2.8, x: 0 };
        tRE = { z: -0.25 };
        tLS = { z: 2.8, x: 0 };
        tLE = { z: -0.25 };
        rootY = position[1] + Math.abs(Math.sin(t * 3)) * 0.4;
        break;
      }

      case "defeat": {
        tRS = { z: 0.7 };
        tLS = { z: 0.7 };
        tRE = { z: -0.9 };
        tLE = { z: -0.9 };
        tRH = { z: 0.25 };
        tLH = { z: 0.25 };
        tRK = { z: -0.35 };
        tLK = { z: -0.35 };
        tTorsoX = 0.55;
        rootY = position[1] - 0.28;
        break;
      }
    }

    rootRef.current.position.y += (rootY - rootRef.current.position.y) * LERP;
    if (action !== "hit") {
      rootRef.current.position.x += (position[0] - rootRef.current.position.x) * LERP;
    }

    // Lerp z (and x when specified, otherwise reset to 0) for a joint group
    const lj = (ref: { current: THREE.Group | null }, tgt: JointTarget) => {
      if (!ref.current) return;
      ref.current.rotation.z += (tgt.z - ref.current.rotation.z) * LERP;
      const tx = tgt.x ?? 0;
      ref.current.rotation.x += (tx - ref.current.rotation.x) * LERP;
    };

    lj(rShoulderRef, tRS);
    lj(rElbowRef,    tRE);
    lj(lShoulderRef, tLS);
    lj(lElbowRef,    tLE);
    lj(rHipRef,  tRH);
    lj(rKneeRef, tRK);
    lj(lHipRef,  tLH);
    lj(lKneeRef, tLK);

    if (torsoRef.current) {
      torsoRef.current.rotation.x += (tTorsoX - torsoRef.current.rotation.x) * LERP;
    }
  });

  const mat = (color: string, emissive?: string, intensity = 0.2) => (
    <meshStandardMaterial
      color={color}
      emissive={emissive ?? color}
      emissiveIntensity={intensity}
      roughness={0.6}
      metalness={0.3}
    />
  );

  return (
    <group ref={rootRef} position={position} castShadow>
      {/* Upper body — torso group carries head + arms and rotates for lean */}
      <group ref={torsoRef}>
        {/* Head */}
        <mesh position={[0, 2.1, 0]} castShadow>
          <boxGeometry args={[0.45, 0.45, 0.4]} />
          {mat(config.headColor, config.emissive, 0.3)}
        </mesh>
        <mesh position={[ 0.12, 2.15, 0.21]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial emissive={config.accentColor} emissiveIntensity={2} color={config.accentColor} />
        </mesh>
        <mesh position={[-0.12, 2.15, 0.21]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial emissive={config.accentColor} emissiveIntensity={2} color={config.accentColor} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.85, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.2, 8]} />
          {mat(config.headColor)}
        </mesh>
        {/* Torso */}
        <mesh position={[0, 1.3, 0]} scale={config.bodyScale ?? [1, 1, 1]} castShadow>
          <boxGeometry args={[0.65, 0.8, 0.38]} />
          {mat(config.bodyColor, config.emissive, 0.15)}
        </mesh>
        {/* Chest accent */}
        <mesh position={[0, 1.4, 0.2]}>
          <boxGeometry args={[0.3, 0.35, 0.05]} />
          {mat(config.accentColor, config.accentColor, 0.4)}
        </mesh>

        {/* ── Right arm ── shoulder pivot */}
        <group ref={rShoulderRef} position={[0.42, 1.55, 0]}>
          <mesh position={[0, -U_ARM / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.09, U_ARM, 8]} />
            {mat(config.bodyColor)}
          </mesh>
          {/* Elbow pivot */}
          <group ref={rElbowRef} position={[0, -U_ARM, 0]}>
            <mesh position={[0, -FOREARM / 2, 0]}>
              <cylinderGeometry args={[0.08, 0.07, FOREARM, 8]} />
              {mat(config.accentColor)}
            </mesh>
            {/* Fist + weapon (right hand) */}
            <group position={[0, -FOREARM, 0]}>
              <mesh>
                <boxGeometry args={[0.18, 0.16, 0.18]} />
                {mat(config.accentColor, config.accentColor, 0.3)}
              </mesh>
              <WeaponMesh type={config.weapon} accentColor={config.accentColor} side="right" />
            </group>
          </group>
        </group>

        {/* ── Left arm ── shoulder pivot */}
        <group ref={lShoulderRef} position={[-0.42, 1.55, 0]}>
          <mesh position={[0, -U_ARM / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.09, U_ARM, 8]} />
            {mat(config.bodyColor)}
          </mesh>
          {/* Elbow pivot */}
          <group ref={lElbowRef} position={[0, -U_ARM, 0]}>
            <mesh position={[0, -FOREARM / 2, 0]}>
              <cylinderGeometry args={[0.08, 0.07, FOREARM, 8]} />
              {mat(config.accentColor)}
            </mesh>
            {/* Fist + weapon (left hand — only daggers) */}
            <group position={[0, -FOREARM, 0]}>
              <mesh>
                <boxGeometry args={[0.18, 0.16, 0.18]} />
                {mat(config.accentColor, config.accentColor, 0.3)}
              </mesh>
              <WeaponMesh type={config.weapon} accentColor={config.accentColor} side="left" />
            </group>
          </group>
        </group>
      </group>

      {/* Hips block */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.55, 0.22, 0.35]} />
        {mat(config.bodyColor)}
      </mesh>

      {/* ── Right leg ── hip pivot */}
      <group ref={rHipRef} position={[0.2, 0.74, 0]}>
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.13, 0.11, U_LEG, 8]} />
          {mat(config.bodyColor)}
        </mesh>
        {/* Knee pivot */}
        <group ref={rKneeRef} position={[0, -U_LEG, 0]}>
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.08, SHIN, 8]} />
            {mat(config.accentColor)}
          </mesh>
          <mesh position={[0.02, -SHIN, 0.07]}>
            <boxGeometry args={[0.22, 0.1, 0.32]} />
            {mat(config.accentColor)}
          </mesh>
        </group>
      </group>

      {/* ── Left leg ── hip pivot */}
      <group ref={lHipRef} position={[-0.2, 0.74, 0]}>
        <mesh position={[0, -U_LEG / 2, 0]}>
          <cylinderGeometry args={[0.13, 0.11, U_LEG, 8]} />
          {mat(config.bodyColor)}
        </mesh>
        {/* Knee pivot */}
        <group ref={lKneeRef} position={[0, -U_LEG, 0]}>
          <mesh position={[0, -SHIN / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.08, SHIN, 8]} />
            {mat(config.accentColor)}
          </mesh>
          <mesh position={[-0.02, -SHIN, 0.07]}>
            <boxGeometry args={[0.22, 0.1, 0.32]} />
            {mat(config.accentColor)}
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default Fighter3D;
