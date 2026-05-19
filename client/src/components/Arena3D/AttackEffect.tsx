import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpriteAction } from "./Fighter3D";

const ATTACK_ACTIONS: SpriteAction[] = ["punch", "attack", "kick", "weapon-strike"];

function AttackEffect({
  action,
  accentColor,
}: {
  action: SpriteAction;
  accentColor: string;
}) {
  const arcRef  = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const prevAction = useRef<SpriteAction>(action);
  const startTime  = useRef(-99);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const isAttack  = ATTACK_ACTIONS.includes(action);
    const wasAttack = ATTACK_ACTIONS.includes(prevAction.current);

    if (isAttack && !wasAttack) {
      startTime.current = t;
    }
    prevAction.current = action;

    const elapsed   = t - startTime.current;
    const duration  = 0.38;
    const progress  = Math.min(elapsed / duration, 1.0);
    const envelope  = Math.sin(progress * Math.PI); // 0→1→0

    if (arcRef.current) {
      const mat = arcRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity          = envelope * 0.80;
      mat.emissiveIntensity = (1 - progress) * 3.5;
      arcRef.current.scale.setScalar(0.25 + progress * 1.90);
      arcRef.current.rotation.z = -progress * 1.40;
    }

    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - progress) * 0.55;
      ringRef.current.scale.setScalar(0.35 + progress * 2.60);
    }
  });

  // Position at ~right-hand weapon area in fighter local space
  return (
    <group position={[0.55, 1.15, 0.28]}>
      {/* Slash arc — partial torus */}
      <mesh ref={arcRef}>
        <torusGeometry args={[0.32, 0.017, 6, 28, Math.PI * 1.35]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={3.5}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Expanding impact ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.22, 0.010, 6, 32]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={2.5}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

export default AttackEffect;
