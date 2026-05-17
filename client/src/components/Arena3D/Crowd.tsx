import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CrowdMember({
  x,
  z,
  scale,
  offset,
}: {
  x: number;
  z: number;
  scale: number;
  offset: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime * 1.5 + offset) * 0.05;
    }
  });
  return (
    <group ref={ref} position={[x, scale * 0.8, z]} scale={scale}>
      {/* Head */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.4, 0.7, 0.2]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}

function Crowd() {
  const crowdMembers = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: (Math.random() - 0.5) * 16,
        z: -4 - Math.random() * 4,
        scale: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      })),
    []
  );

  return (
    <group>
      {crowdMembers.map((m, i) => (
        <CrowdMember key={i} {...m} />
      ))}
    </group>
  );
}

export default Crowd;
