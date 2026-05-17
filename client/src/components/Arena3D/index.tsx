import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import ArenaScene from "./ArenaScene";
import type { SpriteAction } from "./Fighter3D";

interface Arena3DProps {
  playerCharacter: string;
  npcCharacter: string;
  playerAction: SpriteAction;
  npcAction: SpriteAction;
  tierColor?: string;
  onReady?: () => void;
  shakeIntensity?: number;
}

export default function Arena3D(props: Arena3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.5, 9], fov: 55 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true }}
    >
      <Suspense fallback={null}>
        <ArenaScene {...props} />
      </Suspense>
    </Canvas>
  );
}
