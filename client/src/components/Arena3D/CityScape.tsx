import { useMemo } from "react";

const WINDOW_COLORS = ["#00bfff", "#7b2fff", "#ff3d6b"];

function CityScape() {
  const buildings = useMemo(() => {
    // 18 buildings, seeded so they're stable
    return Array.from({ length: 18 }, (_, i) => {
      const seed1 = Math.abs(Math.sin(i * 127.1 + 311.7));
      const seed2 = Math.abs(Math.sin(i * 269.5 + 183.3));
      const seed3 = Math.abs(Math.sin(i * 419.2 + 74.6));
      const seed4 = Math.abs(Math.sin(i * 531.8 + 256.1));
      return {
        x:       (i - 8.5) * 2.1 + (seed1 - 0.5) * 0.8,
        height:  4 + seed2 * 14,
        width:   0.9 + seed3 * 1.6,
        depth:   0.7 + seed4 * 0.9,
        colorIdx: i % 3,
      };
    });
  }, []);

  return (
    <group position={[0, -1, -14]}>
      {buildings.map((b, i) => {
        const windowRows = Math.max(1, Math.floor(b.height / 1.3));
        const color = WINDOW_COLORS[b.colorIdx];
        return (
          <group key={i} position={[b.x, b.height / 2, 0]}>
            {/* Main structure */}
            <mesh>
              <boxGeometry args={[b.width, b.height, b.depth]} />
              <meshStandardMaterial color="#060010" roughness={0.7} metalness={0.5} />
            </mesh>
            {/* Window glow strips */}
            {Array.from({ length: windowRows }, (_, j) => (
              <mesh key={j} position={[0, -b.height / 2 + 0.5 + j * 1.2, b.depth / 2 + 0.01]}>
                <planeGeometry args={[b.width * 0.65, 0.10]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.85}
                  transparent
                  opacity={0.55}
                />
              </mesh>
            ))}
            {/* Rooftop antenna (every 3rd building) */}
            {i % 3 === 0 && (
              <mesh position={[0, b.height / 2 + 0.6, 0]}>
                <cylinderGeometry args={[0.03, 0.05, 1.2, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default CityScape;
