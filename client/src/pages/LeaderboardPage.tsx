import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import FighterSprite from "../components/FighterSprite";

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  wins: number;
  losses: number;
  winStreak: number;
  character: { name: string } | null;
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_LABELS = ["1ST", "2ND", "3RD"];
const MEDAL_GLOW = [
  "rgba(255,215,0,0.3)",
  "rgba(192,192,192,0.3)",
  "rgba(205,127,50,0.3)",
];

export default function LeaderboardPage() {
  const { player } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/players/leaderboard")
      .then(({ data }) => setEntries(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div
      className="min-h-screen -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12"
      style={{ background: "radial-gradient(ellipse at center, #0a0510 0%, #060308 60%, #000 100%)" }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <motion.h1
            animate={{
              textShadow: [
                "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
                "0 0 35px #FF3D6B, 0 0 90px #FF3D6BB0",
                "0 0 20px #FF3D6B, 0 0 60px #FF3D6B80",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-6xl sm:text-7xl text-white tracking-widest uppercase"
          >
            LEADERBOARD
          </motion.h1>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div
              className="h-px flex-1 max-w-[140px]"
              style={{ background: "linear-gradient(to right, transparent, #FF3D6B)" }}
            />
            <span className="font-ui text-xs uppercase tracking-[0.3em] text-secondary-text">
              Top Warriors
            </span>
            <div
              className="h-px flex-1 max-w-[140px]"
              style={{ background: "linear-gradient(to left, transparent, #FF3D6B)" }}
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Podium — Top 3 */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {/* Reorder: 2nd, 1st, 3rd for podium effect on desktop */}
                {[
                  top3[1] ? { entry: top3[1], rank: 1 } : null,
                  top3[0] ? { entry: top3[0], rank: 0 } : null,
                  top3[2] ? { entry: top3[2], rank: 2 } : null,
                ]
                  .filter(Boolean)
                  .map((item) => {
                    if (!item) return null;
                    const { entry, rank } = item;
                    const color = MEDAL_COLORS[rank];
                    const glow = MEDAL_GLOW[rank];
                    const spriteSize = rank === 0 ? 160 : 130;
                    const isCurrentPlayer = entry.id === player?.id;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + rank * 0.1 }}
                        className="rounded-2xl border p-6 flex flex-col items-center text-center relative overflow-hidden"
                        style={{
                          background: `radial-gradient(ellipse at top, ${glow} 0%, rgba(10,5,20,0.95) 70%)`,
                          borderColor: color,
                          boxShadow: `0 0 30px ${glow}, inset 0 0 20px ${glow}`,
                          order: rank === 0 ? -1 : rank,
                        }}
                      >
                        {isCurrentPlayer && (
                          <div
                            className="absolute top-2 right-2 text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: color, color: "#000" }}
                          >
                            YOU
                          </div>
                        )}

                        {/* Rank number */}
                        <div
                          className="font-display text-7xl leading-none mb-2"
                          style={{ color, textShadow: `0 0 20px ${color}` }}
                        >
                          {rank + 1}
                        </div>
                        <div
                          className="font-ui text-xs uppercase tracking-widest mb-4"
                          style={{ color }}
                        >
                          {MEDAL_LABELS[rank]}
                        </div>

                        {/* Fighter sprite */}
                        <div className="mb-4">
                          <FighterSprite
                            character={entry.character?.name ?? "Ironclad"}
                            side="left"
                            action="idle"
                            size={spriteSize}
                          />
                        </div>

                        {/* Username */}
                        <h3
                          className="font-display text-xl tracking-wider mb-1"
                          style={{ color: "#fff" }}
                        >
                          {entry.username.toUpperCase()}
                        </h3>
                        {entry.character && (
                          <p
                            className="font-ui text-xs mb-3"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            {entry.character.name}
                          </p>
                        )}

                        {/* XP */}
                        <div
                          className="font-display text-2xl mb-3"
                          style={{ color: "#FFD600" }}
                        >
                          {entry.xp.toLocaleString()}{" "}
                          <span
                            className="font-ui text-xs"
                            style={{ color: "rgba(255,214,0,0.6)" }}
                          >
                            XP
                          </span>
                        </div>

                        {/* W/L */}
                        <div
                          className="font-ui text-sm"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          <span style={{ color: "#00FF9D" }}>{entry.wins}W</span>
                          {" / "}
                          <span style={{ color: "#FF3D6B" }}>{entry.losses}L</span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}

            {/* Positions 4–25 */}
            {rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl overflow-hidden border"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  const isCurrentPlayer = entry.id === player?.id;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0"
                      style={{
                        borderColor: "rgba(255,255,255,0.05)",
                        background: isCurrentPlayer
                          ? "rgba(255,61,107,0.08)"
                          : "transparent",
                      }}
                    >
                      {/* Rank */}
                      <div
                        className="font-display text-lg w-8 text-center flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {rank}
                      </div>

                      {/* Sprite */}
                      <div className="flex-shrink-0">
                        <FighterSprite
                          character={entry.character?.name ?? "Ironclad"}
                          side="left"
                          action="idle"
                          size={50}
                        />
                      </div>

                      {/* Username + character */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-display text-sm tracking-wider truncate"
                            style={{
                              color: isCurrentPlayer ? "#FF3D6B" : "#fff",
                            }}
                          >
                            {entry.username.toUpperCase()}
                          </span>
                          {isCurrentPlayer && (
                            <span
                              className="text-[10px] font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                background: "rgba(255,61,107,0.2)",
                                color: "#FF3D6B",
                                border: "1px solid rgba(255,61,107,0.3)",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        {entry.character && (
                          <p
                            className="font-ui text-[11px] truncate"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            {entry.character.name}
                          </p>
                        )}
                      </div>

                      {/* XP */}
                      <div
                        className="font-display text-sm hidden sm:block"
                        style={{ color: "#FFD600", minWidth: 80, textAlign: "right" }}
                      >
                        {entry.xp.toLocaleString()}
                        <span
                          className="font-ui text-[10px] ml-1"
                          style={{ color: "rgba(255,214,0,0.5)" }}
                        >
                          XP
                        </span>
                      </div>

                      {/* W/L */}
                      <div
                        className="font-ui text-xs hidden sm:block"
                        style={{ color: "rgba(255,255,255,0.45)", minWidth: 60, textAlign: "right" }}
                      >
                        <span style={{ color: "#00FF9D" }}>{entry.wins}W</span>
                        {" / "}
                        <span style={{ color: "#FF3D6B" }}>{entry.losses}L</span>
                      </div>

                      {/* Win streak */}
                      {entry.winStreak > 0 && (
                        <div
                          className="font-ui text-xs flex-shrink-0"
                          style={{ color: "#f59e0b" }}
                        >
                          {entry.winStreak} streak
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {entries.length === 0 && (
              <div className="text-center py-16">
                <p className="font-ui text-secondary-text">
                  No warriors have fought yet. Be the first!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
