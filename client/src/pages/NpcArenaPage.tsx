import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Npc, Weapon, RANK_LABELS, RANK_COLORS } from "../lib/types";

type NpcTier = "BEGINNER" | "WARRIOR" | "ELITE";

const TIER_LABELS: Record<NpcTier, string> = {
  BEGINNER: "Beginner",
  WARRIOR: "Warrior",
  ELITE: "Elite",
};

const TIER_COLORS: Record<NpcTier, string> = {
  BEGINNER: "#22c55e",
  WARRIOR: "#f59e0b",
  ELITE: "#ef4444",
};

const TIER_ORDER: NpcTier[] = ["BEGINNER", "WARRIOR", "ELITE"];

export default function NpcArenaPage() {
  useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get("tier") as NpcTier | null;

  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<Set<NpcTier>>(
    new Set(tierParam ? [tierParam] : ["BEGINNER"])
  );

  // Weapon selector modal state
  const [battleTarget, setBattleTarget] = useState<Npc | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<string>("");

  useEffect(() => {
    Promise.all([
      api.get("/npcs"),
      api.get("/weapons"),
    ])
      .then(([npcsRes, weaponsRes]) => {
        setNpcs(npcsRes.data);
        setWeapons(weaponsRes.data.filter((w: Weapon) => !w.isStaked));
      })
      .catch(() => toast.error("Failed to load arena data"))
      .finally(() => setLoading(false));
  }, []);

  const toggleTier = (tier: NpcTier) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const handleBattle = () => {
    if (!battleTarget) return;
    navigate(`/arena/npc/fight/${battleTarget.id}`, {
      state: { weaponId: selectedWeapon || undefined, npcName: battleTarget.name },
    });
  };

  const startFight = (npc: Npc) => {
    if (weapons.length === 0) {
      // No weapons — go straight to fight without weapon selection
      navigate(`/arena/npc/fight/${npc.id}`, {
        state: { npcName: npc.name },
      });
    } else {
      setBattleTarget(npc);
      setSelectedWeapon(weapons[0]?.id ?? "");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      style={tierParam ? { minHeight: "100vh", background: "radial-gradient(ellipse at center, #1a0a0a 0%, #0a0005 60%, #000 100%)" } : {}}
    >
      {/* Header */}
      {tierParam ? (
        <div className="pt-4">
          <button
            onClick={() => navigate("/arena")}
            className="flex items-center gap-2 font-ui text-sm mb-6 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Arena
          </button>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <p
              className="font-ui text-xs uppercase tracking-[0.4em] mb-2"
              style={{ color: TIER_COLORS[tierParam] }}
            >
              {TIER_LABELS[tierParam]} Tier
            </p>
            <h1
              className="font-display text-5xl tracking-widest uppercase"
              style={{
                color: "#fff",
                textShadow: `0 0 20px ${TIER_COLORS[tierParam]}, 0 0 60px ${TIER_COLORS[tierParam]}60`,
              }}
            >
              SELECT YOUR OPPONENT
            </h1>
          </motion.div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-3xl text-primary-text">NPC ARENA</h1>
          <p className="text-secondary-text font-ui text-sm">
            Battle AI opponents to earn XP. No weapon wagering — pure combat.
          </p>
        </div>
      )}

      {/* XP Reward reference — only show when no tier filter */}
      {!tierParam && (
        <div className="grid grid-cols-3 gap-3">
          {TIER_ORDER.map((tier) => {
            const rewards: Record<NpcTier, number> = { BEGINNER: 50, WARRIOR: 75, ELITE: 100 };
            return (
              <div key={tier} className="card flex flex-col items-center py-4">
                <span
                  className="font-ui font-bold text-xs uppercase tracking-wider mb-1"
                  style={{ color: TIER_COLORS[tier] }}
                >
                  {TIER_LABELS[tier]}
                </span>
                <span className="font-display text-xl text-storm-gold">+{rewards[tier]} XP</span>
                <span className="text-[10px] text-secondary-text font-ui">per win</span>
              </div>
            );
          })}
        </div>
      )}

      {/* When tier param is set: show dramatic grid of that tier's NPCs */}
      {tierParam ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {npcs
            .filter((n) => n.tier === tierParam)
            .map((npc, i) => (
              <motion.div
                key={npc.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border overflow-hidden flex flex-col"
                style={{
                  background: `linear-gradient(135deg, #1a0a0a 0%, #0d0005 100%)`,
                  borderColor: `${TIER_COLORS[tierParam]}40`,
                  boxShadow: `0 0 20px ${TIER_COLORS[tierParam]}20`,
                }}
              >
                <div
                  className="w-full h-28 flex items-center justify-center text-6xl"
                  style={{ background: `radial-gradient(circle, ${TIER_COLORS[tierParam]}20 0%, transparent 70%)` }}
                >
                  💀
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display text-xl text-white tracking-wider">{npc.name.toUpperCase()}</h3>
                    <span
                      className="text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0"
                      style={{
                        color: TIER_COLORS[tierParam],
                        borderColor: `${TIER_COLORS[tierParam]}40`,
                        backgroundColor: `${TIER_COLORS[tierParam]}15`,
                      }}
                    >
                      {TIER_LABELS[tierParam]}
                    </span>
                  </div>
                  <p className="text-sm font-ui flex-1 mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {npc.description}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startFight(npc)}
                    className="w-full py-3 rounded-xl font-display tracking-[0.2em] text-lg uppercase transition-all"
                    style={{
                      background: `${TIER_COLORS[tierParam]}20`,
                      border: `2px solid ${TIER_COLORS[tierParam]}80`,
                      color: TIER_COLORS[tierParam],
                      textShadow: `0 0 10px ${TIER_COLORS[tierParam]}60`,
                    }}
                  >
                    FIGHT
                  </motion.button>
                </div>
              </motion.div>
            ))}
        </div>
      ) : (
      /* Tier Sections — original collapsible view */
      <>
      {TIER_ORDER.map((tier) => {
        const tierNpcs = npcs.filter((n) => n.tier === tier);
        const isExpanded = expandedTiers.has(tier);
        return (
          <div key={tier} className="card overflow-hidden p-0">
            {/* Tier header */}
            <button
              onClick={() => toggleTier(tier)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TIER_COLORS[tier] }}
                />
                <span className="font-display text-lg text-primary-text">{TIER_LABELS[tier].toUpperCase()}</span>
                <span className="text-xs font-ui text-secondary-text">{tierNpcs.length} opponents</span>
              </div>
              <svg
                className={`w-4 h-4 text-secondary-text transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-card-border pt-4">
                {tierNpcs.map((npc, i) => (
                  <motion.div
                    key={npc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-deep-navy/60 rounded-xl border border-card-border p-4 flex flex-col"
                  >
                    {/* NPC image placeholder */}
                    <div className="w-full h-20 bg-card-surface rounded-lg flex items-center justify-center mb-3">
                      <span className="text-3xl">&#x1F916;</span>
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-display text-base text-primary-text leading-tight">{npc.name.toUpperCase()}</h3>
                      <span
                        className="text-[10px] font-ui font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0"
                        style={{ color: TIER_COLORS[tier], borderColor: `${TIER_COLORS[tier]}40`, backgroundColor: `${TIER_COLORS[tier]}15` }}
                      >
                        {TIER_LABELS[tier]}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-text font-ui flex-1 mb-3">{npc.description}</p>
                    <p className="text-[10px] font-ui text-arc-cyan/70 mb-3">
                      Character: {npc.character.name}
                    </p>

                    <button
                      onClick={() => startFight(npc)}
                      className="btn-primary w-full text-sm py-2"
                    >
                      Battle
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      </>
      )}

      {/* Weapon Selector Modal */}
      <AnimatePresence>
        {battleTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setBattleTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card-surface border border-card-border rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="font-display text-xl text-primary-text mb-1">
                BATTLE {battleTarget.name.toUpperCase()}
              </h2>
              <p className="text-secondary-text font-ui text-sm mb-5">
                Select a weapon to enter battle with.
              </p>

              {weapons.length === 0 ? (
                <p className="text-secondary-text font-ui text-sm text-center py-4">
                  No available weapons. Forge one first!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
                  {weapons.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWeapon(w.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left ${
                        selectedWeapon === w.id
                          ? "border-arc-cyan bg-arc-cyan/10"
                          : "border-card-border hover:border-secondary-text"
                      }`}
                    >
                      <div>
                        <p className="font-ui font-semibold text-sm text-primary-text">{w.name}</p>
                        <p className="text-xs text-secondary-text font-ui">
                          <span style={{ color: RANK_COLORS[w.rank] }}>{RANK_LABELS[w.rank]}</span>
                          {" · "}{w.wins}W / {w.losses}L
                        </p>
                      </div>
                      {selectedWeapon === w.id && (
                        <span className="w-4 h-4 rounded-full bg-arc-cyan flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-deep-navy" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setBattleTarget(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBattle}
                  className="btn-primary flex-1"
                >
                  FIGHT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
