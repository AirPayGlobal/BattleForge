import { AnimatePresence, motion } from "framer-motion";

export function Announcer({ text, tone = "cyan" }: { text: string | null; tone?: "cyan" | "pink" | "gold" | "red" }) {
  const toneClass = {
    cyan: "neon-text-cyan text-neon-cyan",
    pink: "neon-text-pink text-neon-pink",
    gold: "neon-text-gold text-neon-gold",
    red:  "neon-text-red text-neon-red",
  }[tone];

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 1.6, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, scale: 1.0, letterSpacing: "0.22em" }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
          {/* horizontal slash bars */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-1/2 left-0 right-0 h-[2px] origin-left"
            style={{ background: "linear-gradient(90deg, transparent, #FF2BD6, #00F0FF, transparent)", boxShadow: "0 0 14px #FF2BD6" }}
          />
          <div className={`announce text-[18vmin] leading-none ${toneClass}`}>
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
