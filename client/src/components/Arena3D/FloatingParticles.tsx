import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingParticles({ color }: { color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 80;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x:      (Math.abs(Math.sin(i * 73.1)) - 0.5) * 13,
        startY: Math.abs(Math.sin(i * 137.5)) * 4.5,
        z:      (Math.abs(Math.sin(i * 211.3)) - 0.5) * 5 - 1.5,
        speed:  0.25 + Math.abs(Math.sin(i * 317.7)) * 0.55,
        drift:  Math.sin(i * 419.1),
        phase:  Math.abs(Math.sin(i * 523.9)) * Math.PI * 2,
        size:   0.012 + Math.abs(Math.sin(i * 631.2)) * 0.032,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    particles.forEach((p, i) => {
      const y = ((p.startY + t * p.speed * 0.12) % 5.5);
      dummy.position.set(
        p.x + Math.sin(t * 0.42 + p.phase) * 0.35,
        y,
        p.z + Math.cos(t * 0.28 + p.drift) * 0.20,
      );
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        transparent
        opacity={0.75}
      />
    </instancedMesh>
  );
}

export default FloatingParticles;
