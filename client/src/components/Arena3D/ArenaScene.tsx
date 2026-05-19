import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ArenaFloor from "./ArenaFloor";
import Crowd from "./Crowd";
import Fighter3D, { type SpriteAction } from "./Fighter3D";
import CityScape from "./CityScape";
import FloatingParticles from "./FloatingParticles";

interface ArenaSceneProps {
  playerCharacter: string;
  npcCharacter: string;
  playerAction: SpriteAction;
  npcAction: SpriteAction;
  tierColor?: string;
  shakeIntensity?: number;
}

function ArenaScene({
  playerCharacter,
  npcCharacter,
  playerAction,
  npcAction,
  tierColor = "#FF3D6B",
  shakeIntensity = 0,
}: ArenaSceneProps) {
  const rimLRef = useRef<THREE.PointLight>(null);
  const rimRRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (shakeIntensity > 0) {
      state.camera.position.x = Math.sin(t * 30) * shakeIntensity * 0.15;
      state.camera.position.y = 2.5 + Math.cos(t * 25) * shakeIntensity * 0.10;
    } else {
      state.camera.position.x += (0 - state.camera.position.x) * 0.1;
      state.camera.position.y += (2.5 - state.camera.position.y) * 0.1;
    }

    // Rim lights breathe out of phase for a living arena feel
    if (rimLRef.current) rimLRef.current.intensity = 1.15 + Math.sin(t * 1.7) * 0.25;
    if (rimRRef.current) rimRRef.current.intensity = 1.15 + Math.sin(t * 1.7 + Math.PI) * 0.25;

    // Dynamic FOV — slight zoom on attacks for cinematic punch
    const isAnyAttack = ["punch","attack","kick","weapon-strike"].includes(playerAction) ||
                        ["punch","attack","kick","weapon-strike"].includes(npcAction);
    const targetFov = isAnyAttack ? 57 : 52;
    (state.camera as THREE.PerspectiveCamera).fov +=
      (targetFov - (state.camera as THREE.PerspectiveCamera).fov) * 0.06;
    (state.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  });

  return (
    <>
      {/* ─── Lighting ─── */}

      {/* Low ambient — keeps shadows dramatic */}
      <ambientLight intensity={0.16} color="#0a0020" />

      {/* High-angle key light — wide shadow map for crisp character shadows */}
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

      {/* Cool fill from front — lifts mid-tones without washing out shadows */}
      <directionalLight position={[0, 3, 9]} intensity={0.30} color="#2040ff" />

      {/* Rim / kicker lights — tier color, opposite sides, breathing */}
      <pointLight ref={rimLRef} position={[-4, 4.5, -1.5]} intensity={1.15} color={tierColor} distance={14} />
      <pointLight ref={rimRRef} position={[ 4, 4.5, -1.5]} intensity={1.15} color={tierColor} distance={14} />

      {/* Floor bounce — illuminates underside of armor, enhances reflections */}
      <pointLight position={[0, 0.1, 0.5]} intensity={0.55} color={tierColor} distance={7} />

      {/* Back atmosphere — deep violet for depth on crowd silhouettes */}
      <pointLight position={[0, 7, -6]} intensity={0.7} color="#6010e0" distance={18} />

      {/* ─── Scene ─── */}
      <ArenaFloor tierColor={tierColor} />
      <CityScape />
      <FloatingParticles color={tierColor} />
      <Crowd tierColor={tierColor} />

      {/* ─── Fighters ─── */}
      <Fighter3D
        character={playerCharacter}
        position={[-2, 0, 0]}
        facingRight={true}
        action={playerAction}
      />
      <Fighter3D
        character={npcCharacter}
        position={[2, 0, 0]}
        facingRight={false}
        action={npcAction}
      />

      {/* Deep purple-black fog for cinematic depth */}
      <fog attach="fog" args={["#04000e", 11, 22]} />
    </>
  );
}

export default ArenaScene;
