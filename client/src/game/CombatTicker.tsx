import { useFrame } from "@react-three/fiber";
import type { CombatEngine } from "./engine";

/**
 * Mounted inside the R3F <Canvas/> so we tick with frame timing.
 * Returns no visual output; just drives the engine and bubbles events up.
 */
export function CombatTicker({
  engineRef,
  pumpInputs,
  onAfterTick,
}: {
  engineRef: React.MutableRefObject<CombatEngine | null>;
  pumpInputs: () => void;
  onAfterTick: () => void;
}) {
  useFrame((_state, deltaSec) => {
    const eng = engineRef.current;
    if (!eng) return;
    // clamp dt so a tab-switch doesn't catapult the sim
    const dt = Math.min(0.05, deltaSec);
    pumpInputs();
    eng.tick(dt);
    onAfterTick();
  });
  return null;
}
