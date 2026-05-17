import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Weapon, RANK_LABELS, RANK_COLORS } from "../lib/types";

export default function ArenaMatchmakingPage() {
  const { player } = useAuth();
  const navigate = useNavigate();

  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loadingWeapons, setLoadingWeapons] = useState(true);
  const [showWeaponModal, setShowWeaponModal] = useState(true);
  const [selectedWeapon, setSelectedWeapon] = useState<string>("");
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [searchDots, setSearchDots] = useState(".");

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    api
      .get("/weapons")
      .then(({ data }) => {
        const available = data.filter((w: Weapon) => !w.isStaked);
        setWeapons(available);
        if (available.length > 0) setSelectedWeapon(available[0].id);
      })
      .catch(() => toast.error("Failed to load weapons"))
      .finally(() => setLoadingWeapons(false));
  }, []);

  // Animated search dots
  useEffect(() => {
    if (!inQueue) return;
    const t = setInterval(() => {
      setSearchDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(t);
  }, [inQueue]);

  const handleEnterQueue = () => {
    if (!selectedWeapon || !player) return;
    setShowWeaponModal(false);
    setInQueue(true);

    const socket = io("/matchmaking", {
      auth: { playerId: player.id },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-queue", { playerId: player.id, weaponId: selectedWeapon });
    });

    socket.on("queue:joined", ({ position }: { position: number }) => {
      setQueuePosition(position);
    });

    socket.on("match:found", ({ duelId }: { duelId: string }) => {
      socket.disconnect();
      navigate(`/arena/fight/${duelId}`);
    });

    socket.on("connect_error", () => {
      toast.error("Connection error — please try again.");
      setInQueue(false);
      setShowWeaponModal(true);
    });
  };

  const handleCancel = () => {
    socketRef.current?.emit("leave-queue");
    socketRef.current?.disconnect();
    navigate("/arena");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #000a1a 0%, #0a0005 60%, #000 100%)" }}
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-md w-full">
        {!inQueue ? (
          /* Not yet in queue — weapon modal covers this */
          <div>
            <motion.h1
              animate={{
                textShadow: [
                  "0 0 20px #00FFFF, 0 0 60px #00FFFF80",
                  "0 0 30px #00FFFF, 0 0 80px #00FFFFB0",
                  "0 0 20px #00FFFF, 0 0 60px #00FFFF80",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-display text-4xl tracking-widest uppercase"
              style={{ color: "#00FFFF" }}
            >
              PVP ARENA
            </motion.h1>
            <p className="font-ui text-sm mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              Select a weapon to enter the queue
            </p>
          </div>
        ) : (
          /* In queue — searching animation */
          <div>
            {/* Pulsing ring */}
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-32">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: "rgba(0,255,255,0.4)" }}
                    animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                    transition={{
                      duration: 2,
                      delay: i * 0.65,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center text-5xl"
                  style={{
                    background: "radial-gradient(circle, rgba(0,255,255,0.15) 0%, transparent 70%)",
                    border: "2px solid rgba(0,255,255,0.4)",
                  }}
                >
                  ⚔️
                </div>
              </div>
            </div>

            <motion.h2
              className="font-display text-3xl tracking-widest uppercase mb-3"
              style={{ color: "#00FFFF" }}
            >
              SEARCHING{searchDots}
            </motion.h2>

            <p className="font-ui text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Waiting for an opponent
            </p>

            {queuePosition !== null && (
              <p className="font-ui text-xs mb-8" style={{ color: "rgba(0,255,255,0.5)" }}>
                Queue position: #{queuePosition}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCancel}
              className="px-10 py-3 rounded-xl font-display tracking-widest uppercase"
              style={{
                background: "rgba(255,61,107,0.1)",
                border: "2px solid rgba(255,61,107,0.4)",
                color: "#FF3D6B",
              }}
            >
              CANCEL
            </motion.button>
          </div>
        )}
      </div>

      {/* Weapon Selector Modal */}
      <AnimatePresence>
        {showWeaponModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) navigate("/arena");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-md"
              style={{
                background: "#0d0a14",
                border: "1px solid rgba(0,255,255,0.3)",
                boxShadow: "0 0 40px rgba(0,255,255,0.1)",
              }}
            >
              <h2 className="font-display text-2xl tracking-widest mb-1" style={{ color: "#00FFFF" }}>
                SELECT WEAPON
              </h2>
              <p className="font-ui text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Your weapon will be staked. Winner claims the loser's weapon.
              </p>

              {loadingWeapons ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : weapons.length === 0 ? (
                <p className="font-ui text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                  No available weapons. Forge one first!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
                  {weapons.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWeapon(w.id)}
                      className="w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left"
                      style={{
                        background:
                          selectedWeapon === w.id
                            ? "rgba(0,255,255,0.08)"
                            : "rgba(255,255,255,0.02)",
                        borderColor:
                          selectedWeapon === w.id
                            ? "rgba(0,255,255,0.5)"
                            : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <div>
                        <p className="font-ui font-semibold text-sm" style={{ color: "#fff" }}>
                          {w.name}
                        </p>
                        <p className="text-xs font-ui mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <span style={{ color: RANK_COLORS[w.rank] }}>{RANK_LABELS[w.rank]}</span>
                          {" · "}{w.wins}W / {w.losses}L
                        </p>
                      </div>
                      {selectedWeapon === w.id && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "#00FFFF" }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/arena")}
                  className="flex-1 py-3 rounded-xl font-display tracking-wider uppercase text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEnterQueue}
                  disabled={!selectedWeapon || weapons.length === 0}
                  className="flex-1 py-3 rounded-xl font-display tracking-wider uppercase text-sm"
                  style={{
                    background: selectedWeapon ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${selectedWeapon ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                    color: selectedWeapon ? "#00FFFF" : "rgba(255,255,255,0.3)",
                    cursor: selectedWeapon ? "pointer" : "not-allowed",
                  }}
                >
                  ENTER QUEUE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
