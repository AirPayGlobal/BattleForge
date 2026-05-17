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
  const groupRef = useRef<THREE.Group>(null);
  const config = CHARACTER_CONFIGS[character.toLowerCase()] ?? CHARACTER_CONFIGS.ironclad;

  // Animation state
  const animRef = useRef({ phase: 0, punchPhase: 0, kickPhase: 0 });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const anim = animRef.current;

    // Reset base transforms
    groupRef.current.rotation.y = facingRight ? 0 : Math.PI;

    switch (action) {
      case "idle":
        groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.04;
        break;
      case "punch":
      case "attack":
        anim.punchPhase = Math.min(anim.punchPhase + 0.15, 1);
        groupRef.current.position.x =
          position[0] + (facingRight ? 1 : -1) * Math.sin(anim.punchPhase * Math.PI) * 0.4;
        break;
      case "kick":
        groupRef.current.position.y = position[1] + Math.sin(t * 8) * 0.1;
        groupRef.current.rotation.z = (facingRight ? 1 : -1) * Math.sin(t * 8) * 0.15;
        break;
      case "jump":
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 4)) * 1.2;
        break;
      case "slide":
        groupRef.current.position.y = position[1] - 0.3;
        groupRef.current.scale.y = 0.7;
        groupRef.current.position.x = position[0] + (facingRight ? 1 : -1) * 0.5;
        break;
      case "weapon-strike":
        groupRef.current.rotation.z = (facingRight ? -1 : 1) * Math.sin(t * 6) * 0.4;
        groupRef.current.position.x =
          position[0] + (facingRight ? 1 : -1) * Math.sin(t * 6) * 0.6;
        break;
      case "block":
        // lean slightly back
        groupRef.current.rotation.z = facingRight ? 0.1 : -0.1;
        break;
      case "hit":
        groupRef.current.position.x =
          position[0] - (facingRight ? 1 : -1) * Math.abs(Math.sin(t * 15)) * 0.3;
        groupRef.current.rotation.z =
          (facingRight ? -1 : 1) * Math.abs(Math.sin(t * 15)) * 0.2;
        break;
      case "victory":
        groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 3)) * 0.5;
        break;
      case "defeat":
        groupRef.current.rotation.z = (facingRight ? -1 : 1) * Math.min(t * 0.5, 0.8);
        groupRef.current.position.y = position[1] - Math.min(t * 0.2, 0.4);
        break;
    }

    // Reset scale unless sliding
    if (action !== "slide") {
      groupRef.current.scale.y += (1 - groupRef.current.scale.y) * 0.2;
    }
    // Reset X position for non-movement actions
    if (!["punch", "attack", "weapon-strike", "slide"].includes(action)) {
      groupRef.current.position.x += (position[0] - groupRef.current.position.x) * 0.15;
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

  const bodyScale = config.bodyScale ?? [1, 1, 1];

  return (
    <group ref={groupRef} position={position} castShadow>
      {/* Head */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.4]} />
        {mat(config.headColor, config.emissive, 0.3)}
      </mesh>

      {/* Eyes glow */}
      <mesh position={[0.12, 2.15, 0.21]}>
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
      <mesh position={[0, 1.3, 0]} scale={bodyScale} castShadow>
        <boxGeometry args={[0.65, 0.8, 0.38]} />
        {mat(config.bodyColor, config.emissive, 0.15)}
      </mesh>

      {/* Chest accent */}
      <mesh position={[0, 1.4, 0.2]}>
        <boxGeometry args={[0.3, 0.35, 0.05]} />
        {mat(config.accentColor, config.accentColor, 0.4)}
      </mesh>

      {/* Hips */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.55, 0.22, 0.35]} />
        {mat(config.bodyColor)}
      </mesh>

      {/* Left upper arm */}
      <mesh position={[-0.45, 1.35, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.1, 0.09, 0.45, 8]} />
        {mat(config.bodyColor)}
      </mesh>
      {/* Left forearm */}
      <mesh position={[-0.52, 1.0, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.08, 0.07, 0.4, 8]} />
        {mat(config.accentColor)}
      </mesh>
      {/* Left fist */}
      <mesh position={[-0.55, 0.76, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.18]} />
        {mat(config.accentColor, config.accentColor, 0.3)}
      </mesh>

      {/* Right upper arm */}
      <mesh position={[0.45, 1.35, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.1, 0.09, 0.45, 8]} />
        {mat(config.bodyColor)}
      </mesh>
      {/* Right forearm */}
      <mesh position={[0.52, 1.0, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.08, 0.07, 0.4, 8]} />
        {mat(config.accentColor)}
      </mesh>
      {/* Right fist/weapon hand */}
      <mesh position={[0.55, 0.76, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.18]} />
        {mat(config.accentColor, config.accentColor, 0.3)}
      </mesh>

      {/* Left upper leg */}
      <mesh position={[-0.2, 0.52, 0]}>
        <cylinderGeometry args={[0.13, 0.11, 0.55, 8]} />
        {mat(config.bodyColor)}
      </mesh>
      {/* Left shin */}
      <mesh position={[-0.2, 0.16, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.45, 8]} />
        {mat(config.accentColor)}
      </mesh>
      {/* Left foot */}
      <mesh position={[-0.2, -0.1, 0.06]}>
        <boxGeometry args={[0.22, 0.1, 0.32]} />
        {mat(config.accentColor)}
      </mesh>

      {/* Right upper leg */}
      <mesh position={[0.2, 0.52, 0]}>
        <cylinderGeometry args={[0.13, 0.11, 0.55, 8]} />
        {mat(config.bodyColor)}
      </mesh>
      {/* Right shin */}
      <mesh position={[0.2, 0.16, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.45, 8]} />
        {mat(config.accentColor)}
      </mesh>
      {/* Right foot */}
      <mesh position={[0.2, -0.1, 0.06]}>
        <boxGeometry args={[0.22, 0.1, 0.32]} />
        {mat(config.accentColor)}
      </mesh>

      {/* Weapon */}
      <WeaponMesh type={config.weapon} accentColor={config.accentColor} />
    </group>
  );
}

export default Fighter3D;
