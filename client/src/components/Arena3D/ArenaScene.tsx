import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import ArenaFloor from "./ArenaFloor";
import Crowd from "./Crowd";
import Fighter3D, { type SpriteAction } from "./Fighter3D";

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
  useFrame((state) => {
    if (shakeIntensity > 0) {
      state.camera.position.x =
        Math.sin(state.clock.elapsedTime * 30) * shakeIntensity * 0.15;
      state.camera.position.y =
        2.5 + Math.cos(state.clock.elapsedTime * 25) * shakeIntensity * 0.1;
    } else {
      state.camera.position.x += (0 - state.camera.position.x) * 0.1;
      state.camera.position.y += (2.5 - state.camera.position.y) * 0.1;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        color="#ffffff"
      />
      <pointLight position={[-3, 3, 2]} intensity={0.8} color={tierColor} />
      <pointLight position={[3, 3, 2]} intensity={0.8} color={tierColor} />

      {/* Arena floor */}
      <ArenaFloor tierColor={tierColor} />

      {/* Crowd */}
      <Crowd />

      {/* Fighters */}
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

      {/* Fog */}
      <fog attach="fog" args={["#0a0005", 12, 25]} />
    </>
  );
}

export default ArenaScene;
