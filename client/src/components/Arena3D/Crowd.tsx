import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CROWD_COLORS = ["#ff3d6b", "#7b2fff", "#00bfff", "#ff9500", "#00ff9d", "#ff6b35"];

function CrowdMember({
  x, z, scale, offset, colorIdx,
}: {
  x: number; z: number; scale: number; offset: number; colorIdx: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const eyeRef  = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 1.5 + offset) * 0.05 * scale;
    }
    if (eyeRef.current) {
      (eyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.2 + Math.sin(t * 2.8 + offset) * 0.4;
    }
  });

  const glowColor = CROWD_COLORS[colorIdx % CROWD_COLORS.length];

  return (
    <group ref={rootRef} position={[x, scale * 0.8, z]} scale={scale}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.36, 0.72, 0.20]} />
        <meshStandardMaterial color="#0a0012" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.56, 0]}>
        <sphereGeometry args={[0.19, 10, 8]} />
        <meshStandardMaterial color="#0d0018" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Helmet / cap glow accent */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.10, 8]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={0.8} roughness={0.4} />
      </mesh>
      {/* Glowing eye slit */}
      <mesh ref={eyeRef} position={[0, 0.52, 0.19]}>
        <boxGeometry args={[0.16, 0.025, 0.02]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={1.2}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

function Crowd({ tierColor = "#FF3D6B" }: { tierColor?: string }) {
  const members = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x:        (Math.random() - 0.5) * 18,
        z:        -4.5 - Math.random() * 5,
        scale:    0.42 + Math.random() * 0.52,
        offset:   Math.random() * Math.PI * 2,
        colorIdx: Math.floor(Math.random() * CROWD_COLORS.length),
      })),
    []
  );

  return (
    <group>
      {members.map((m, i) => (
        <CrowdMember key={i} {...m} />
      ))}
    </group>
  );
}

export default Crowd;
