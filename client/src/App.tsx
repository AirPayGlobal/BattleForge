import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "./game/store";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { CharSelectScene } from "./scenes/CharSelectScene";
import { MatchScene } from "./scenes/MatchScene";
import { PostMatchScene } from "./scenes/PostMatchScene";

/**
 * Root state machine. Each game phase swaps in a scene component with a
 * cross-fade so transitions feel cinematic rather than blink-y.
 */
export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="fixed inset-0 bg-void-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
        >
          {phase === "BOOT" && <BootScene />}
          {phase === "MAIN_MENU" && <MenuScene />}
          {phase === "CHARACTER_SELECT" && <CharSelectScene />}
          {(phase === "MATCH_INTRO" || phase === "FIGHT" || phase === "ROUND_END" || phase === "KO") && <MatchScene />}
          {phase === "MATCH_END" && <PostMatchScene />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
