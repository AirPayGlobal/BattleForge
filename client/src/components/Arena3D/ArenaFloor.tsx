import { ContactShadows } from "@react-three/drei";

function ArenaFloor({ tierColor }: { tierColor: string }) {
  return (
    <group>
      {/* Main floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[6, 8]} />
        <meshStandardMaterial
          color="#1a0a0a"
          roughness={0.8}
          metalness={0.2}
          emissive="#0a0005"
        />
      </mesh>

      {/* Center circle glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial
          color={tierColor}
          emissive={tierColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Outer ring lines - 8 segments */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, angle]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.05, 6]} />
            <meshStandardMaterial
              color={tierColor}
              emissive={tierColor}
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}

      {/* Contact shadows */}
      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={10} blur={2} />
    </group>
  );
}

export default ArenaFloor;
