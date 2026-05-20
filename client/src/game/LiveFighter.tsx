import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import Fighter3D, { type SpriteAction } from "../components/Arena3D/Fighter3D";
import type { CombatEngine } from "./engine";
import type { Role } from "./types";

/**
 * Bridges the headless engine to Fighter3D.
 * Position is a mutable ref-array → no React re-renders per frame.
 * Action / facing only re-render React on transition.
 */
export function LiveFighter({
  engineRef,
  role,
}: {
  engineRef: React.MutableRefObject<CombatEngine | null>;
  role: Role;
}) {
  const posRef = useRef<[number, number, number]>([0, 0, 0]);
  const [action, setAction] = useState<SpriteAction>("idle");
  const [facingRight, setFacingRight] = useState(role === "p1");
  const [meshKey, setMeshKey] = useState<string>("ironclad");

  useFrame(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const f = role === "p1" ? eng.p1 : eng.p2;
    posRef.current[0] = f.x;
    posRef.current[1] = f.y;
    if (f.action !== action) setAction(f.action);
    if (f.facingRight !== facingRight) setFacingRight(f.facingRight);
    if (f.meshKey !== meshKey) setMeshKey(f.meshKey);
  });

  return (
    <Fighter3D
      character={meshKey}
      position={posRef.current}
      facingRight={facingRight}
      action={action}
    />
  );
}
