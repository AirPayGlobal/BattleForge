import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import * as THREE from "three";
import { motion } from "framer-motion";

import { useGameStore } from "../game/store";
import { getFighter } from "../data/characters";
import Fighter3D from "../components/Arena3D/Fighter3D";
import FloatingParticles from "../components/Arena3D/FloatingParticles";

/**
 * Victory screen — winner posed dramatically, defeated fighter half-faded.
 */
export function PostMatchScene() {
  const winner = useGameStore((s) => s.matchWinner);
  const p1Id = useGameStore((s) => s.p1Id);
  const p2Id = useGameStore((s) => s.p2Id);
  const setPhase = useGameStore((s) => s.setPhase);
  const resetMatch = useGameStore((s) => s.resetMatch);

  const winnerDef = getFighter(winner === "p2" ? p2Id : p1Id);
  const loserDef  = getFighter(winner === "p2" ? p1Id : p2Id);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        resetMatch();
        setPhase("CHARACTER_SELECT");
      }
      if (e.code === "Escape") {
        resetMatch();
        setPhase("MAIN_MENU");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setPhase, resetMatch]);

  return (
    <div className="absolute inset-0 conic-bg overflow-hidden scanlines crt-vignette">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 2.2, 6], fov: 40 }} gl={{ antialias: true, toneMapping: 4 }} shadows>
          <ambientLight intensity={0.16} color="#0a0030" />
          <directionalLight position={[2, 7, 4]} intensity={1.6} color="#dceaff" castShadow />
          <pointLight position={[-3, 2.5, 3]} intensity={1.4} color={winnerDef.primary} distance={12} />
          <pointLight position={[3, 1, -2]} intensity={0.7} color="#FF2BD6" distance={10} />

          <WinnerStand meshKey={winnerDef.meshKey} color={winnerDef.primary} />
          <LoserStand meshKey={loserDef.meshKey} />

          <FloatingParticles color={winnerDef.primary} />
          <fog attach="fog" args={["#03020A", 8, 18]} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.22} luminanceSmoothing={0.82} intensity={2.4} mipmapBlur radius={0.78} />
            <ChromaticAberration
              offset={new Vector2(0.0009, 0.0009)}
              radialModulation={false}
              modulationOffset={0}
              blendFunction={BlendFunction.NORMAL}
            />
            <Vignette offset={0.30} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-between p-[5vmin] z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="font-ui text-[1.4vmin] tracking-[0.4em] uppercase text-neon-cyan neon-text-cyan">
            ▍ MATCH RESULT
          </div>
          <motion.div
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[14vmin] leading-none mt-2"
            style={{
              color: winnerDef.primary,
              textShadow: `0 0 14px ${winnerDef.primary}, 0 0 38px ${winnerDef.primary}80`,
            }}
          >
            {winnerDef.callsign}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.95 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="font-display text-[4.4vmin] leading-none tracking-[0.32em] text-neon-pink neon-text-pink"
          >
            WINS THE FORGE
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="holo-panel rounded-sm px-[3vmin] py-[2vmin] flex items-center gap-6"
        >
          <span className="font-ui text-[1.6vmin] tracking-[0.32em] uppercase text-neon-cyan neon-text-cyan">
            [Enter] rematch
          </span>
          <span className="text-muted-text">·</span>
          <span className="font-ui text-[1.6vmin] tracking-[0.32em] uppercase text-neon-pink neon-text-pink">
            [Esc] main menu
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function WinnerStand({ meshKey, color }: { meshKey: string; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef  = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = 0.05 + Math.sin(t * 1.3) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.18;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.4;
      (ringRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.4 + Math.sin(t * 1.6) * 0.4;
    }
  });
  return (
    <>
      <group ref={groupRef} position={[-1.0, 0, 0]}>
        <Fighter3D character={meshKey} position={[0, 0, 0]} facingRight={true} action="victory" />
      </group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[-1.0, 0.005, 0]}>
        <ringGeometry args={[1.0, 1.10, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} transparent opacity={0.9} />
      </mesh>
    </>
  );
}

function LoserStand({ meshKey }: { meshKey: string }) {
  return (
    <group position={[2.4, 0, -0.6]} rotation={[0, -0.3, 0]}>
      <Fighter3D character={meshKey} position={[0, 0, 0]} facingRight={false} action="defeat" />
    </group>
  );
}
