import { AnimatePresence, motion } from "framer-motion";

export interface DamagePopup {
  id: number;
  damage: number;
  heavy: boolean;
  blocked: boolean;
  x: number;            // screen 0..1
  y: number;            // screen 0..1
}

/** A floating damage number popup. */
export function HitMarkers({ popups }: { popups: DamagePopup[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {popups.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.6, y: 0 }}
            animate={{ opacity: 1, scale: p.heavy ? 1.4 : 1.1, y: -80 }}
            exit={{ opacity: 0, scale: 1.1, y: -110 }}
            transition={{ duration: 0.7 }}
            className="absolute"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            <div
              className="font-display leading-none combo-text whitespace-nowrap"
              style={{
                fontSize: p.heavy ? "5vmin" : "3.8vmin",
                color: p.blocked ? "#00F0FF" : (p.heavy ? "#FF2D55" : "#FFC53A"),
                textShadow: p.blocked
                  ? "0 0 10px #00F0FF"
                  : (p.heavy ? "0 0 14px #FF2D55, 0 0 28px #FF2BD6" : "0 0 10px #FFC53A"),
              }}
            >
              {p.blocked ? "BLOCK" : `-${Math.round(p.damage)}`}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
