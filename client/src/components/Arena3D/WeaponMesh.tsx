function WeaponMesh({ type, accentColor }: { type?: string; accentColor: string }) {
  // Position weapons in right hand area
  const weaponPos: [number, number, number] = [0.7, 0.9, 0.1];

  switch (type) {
    case "sword":
      return (
        <group position={weaponPos} rotation={[0, 0, -0.4]}>
          {/* Blade */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.06, 1.2, 0.04]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} emissive="#94a3b8" emissiveIntensity={0.3} />
          </mesh>
          {/* Guard */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.35, 0.06, 0.06]} />
            <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} emissive="#b45309" emissiveIntensity={0.2} />
          </mesh>
        </group>
      );
    case "daggers":
      return (
        <>
          <group position={[0.65, 0.85, 0.1]} rotation={[0, 0, -0.8]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.04, 0.6, 0.03]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} emissive={accentColor} emissiveIntensity={0.5} />
            </mesh>
          </group>
          <group position={[-0.65, 0.85, 0.1]} rotation={[0, 0, 0.8]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.04, 0.6, 0.03]} />
              <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} emissive={accentColor} emissiveIntensity={0.5} />
            </mesh>
          </group>
        </>
      );
    case "staff":
      return (
        <group position={[0.65, 0.7, 0]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.8, 8]} />
            <meshStandardMaterial color="#4c1d95" emissive="#7c3aed" emissiveIntensity={0.4} />
          </mesh>
          {/* Orb */}
          <mesh position={[0, 1.65, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} transparent opacity={0.9} />
          </mesh>
          <pointLight position={[0, 1.65, 0]} color={accentColor} intensity={1.5} distance={3} />
        </group>
      );
    case "flame-sword":
      return (
        <group position={[0.7, 0.9, 0.1]} rotation={[0, 0, -0.4]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.07, 1.2, 0.05]} />
            <meshStandardMaterial color="#f97316" emissive="#dc2626" emissiveIntensity={1.2} />
          </mesh>
          <pointLight position={[0, 0.9, 0.2]} color="#f97316" intensity={2} distance={2.5} />
        </group>
      );
    case "ice-lance":
      return (
        <group position={[0.7, 1.1, 0]} rotation={[0, 0, -0.6]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.03, 0.08, 1.6, 6]} />
            <meshStandardMaterial color="#bae6fd" emissive="#0ea5e9" emissiveIntensity={0.8} transparent opacity={0.85} metalness={0.7} roughness={0.1} />
          </mesh>
          <pointLight position={[0, 0.8, 0]} color="#0ea5e9" intensity={1} distance={2} />
        </group>
      );
    case "fists":
    default:
      return null;
  }
}

export default WeaponMesh;
