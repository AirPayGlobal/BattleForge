import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
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
      camera={{ position: [0, 2.5, 9], fov: 52 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, toneMapping: 4 /* ACESFilmic */ }}
    >
      <Suspense fallback={null}>
        <ArenaScene {...props} />
        <EffectComposer>
          {/* Bloom — makes emissive eyes/emblems/conduits actually glow */}
          <Bloom
            luminanceThreshold={0.22}
            luminanceSmoothing={0.82}
            intensity={2.2}
            mipmapBlur
            radius={0.72}
          />
          {/* Subtle chromatic aberration for cyberpunk lens feel */}
          <ChromaticAberration
            offset={new Vector2(0.0009, 0.0009)}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0.0}
          />
          {/* Vignette darkens corners for cinematic framing */}
          <Vignette offset={0.28} darkness={0.68} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
