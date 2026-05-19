import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function ArenaFloor({ tierColor }: { tierColor: string }) {
  const centerRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (centerRef.current) {
      (centerRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.35 + Math.sin(t * 1.4) * 0.15;
    }
    if (outerRingRef.current) {
      (outerRingRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(t * 2.1 + 1.0) * 0.3;
    }
  });

  return (
    <group>
      {/* Base dark platform — high metalness for reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[7.5, 48]} />
        <meshStandardMaterial
          color="#060010"
          roughness={0.12}
          metalness={0.92}
          emissive="#08001a"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Subtle secondary reflective panel under fighters */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[7, 4.5]} />
        <meshStandardMaterial
          color="#0a0020"
          roughness={0.05}
          metalness={0.98}
          emissive="#0a0020"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Grid lines — X axis (longitudinal) */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={`gx${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[(i - 5) * 0.72, 0.001, 0]}>
          <planeGeometry args={[0.014, 8]} />
          <meshStandardMaterial
            color={tierColor}
            emissive={tierColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.28}
          />
        </mesh>
      ))}

      {/* Grid lines — Z axis (transverse) */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`gz${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, (i - 4) * 0.72]}>
          <planeGeometry args={[10, 0.014]} />
          <meshStandardMaterial
            color={tierColor}
            emissive={tierColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.28}
          />
        </mesh>
      ))}

      {/* Center combat ring — animated pulse */}
      <mesh ref={centerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.72, 0.76, 64]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Mid ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[2.60, 2.635, 80]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Outer combat ring — animated */}
      <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[4.60, 4.645, 96]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Corner marker diamonds — 4 corners */}
      {[[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]].map(([x, z], i) => (
        <mesh key={`dm${i}`} rotation={[-Math.PI / 2, Math.PI / 4, 0]} position={[x, 0.004, z]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshStandardMaterial
            color={tierColor}
            emissive={tierColor}
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Center line divider */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[0.03, 5]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.9}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Arena floor glow — broad ambient pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[3.2, 32]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.08}
          transparent
          opacity={0.18}
        />
      </mesh>

      <ContactShadows position={[0, 0, 0]} opacity={0.85} scale={12} blur={2.8} />
    </group>
  );
}

export default ArenaFloor;
