import { useState, useEffect } from "react";
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

interface BattleResult {
  result: "WIN" | "LOSS";
  xpEarned: number;
  rounds: Array<{
    round: number;
    playerAction: string;
    npcAction: string;
    playerDmg: number;
    npcDmg: number;
    winner: string;
  }> | null;
  npcName: string;
}

export default function NpcArenaPage() {
  const { player, refreshPlayer } = useAuth();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<Set<NpcTier>>(new Set(["BEGINNER"]));

  // Weapon selector modal state
  const [battleTarget, setBattleTarget] = useState<Npc | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<string>("");
  const [battling, setBattling] = useState(false);

  // Result display
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

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

  const handleBattle = async () => {
    if (!battleTarget || !selectedWeapon) return;
    setBattling(true);
    try {
      const { data } = await api.post(`/npcs/${battleTarget.id}/battle`, {
        weaponId: selectedWeapon,
      });
      setBattleResult({
        result: data.result,
        xpEarned: data.xpEarned,
        rounds: data.rounds,
        npcName: battleTarget.name,
      });
      setBattleTarget(null);
      setSelectedWeapon("");
      if (data.result === "WIN") {
        await refreshPlayer();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Battle failed");
    } finally {
      setBattling(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-primary-text">NPC ARENA</h1>
        <p className="text-secondary-text font-ui text-sm">
          Battle AI opponents to earn XP. No weapon wagering — pure combat.
        </p>
      </div>

      {/* XP Reward reference */}
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

      {/* Tier Sections */}
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
                      onClick={() => {
                        setBattleTarget(npc);
                        setSelectedWeapon(weapons[0]?.id ?? "");
                      }}
                      disabled={weapons.length === 0}
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
                  disabled={!selectedWeapon || battling}
                  className="btn-primary flex-1"
                >
                  {battling ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Fighting...
                    </span>
                  ) : (
                    "Confirm Battle"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Result Modal */}
      <AnimatePresence>
        {battleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-surface border border-card-border rounded-2xl p-6 w-full max-w-md"
            >
              {/* Result header */}
              <div className={`text-center mb-6 ${battleResult.result === "WIN" ? "text-victory-green" : "text-danger-red"}`}>
                <div className="text-6xl mb-3">
                  {battleResult.result === "WIN" ? "🏆" : "💀"}
                </div>
                <h2 className="font-display text-4xl">
                  {battleResult.result === "WIN" ? "VICTORY!" : "DEFEAT"}
                </h2>
                <p className="font-ui text-sm text-secondary-text mt-1">
                  vs {battleResult.npcName}
                </p>
              </div>

              {battleResult.result === "WIN" && battleResult.xpEarned > 0 && (
                <div className="bg-storm-gold/10 border border-storm-gold/30 rounded-xl px-4 py-3 mb-5 text-center">
                  <p className="font-display text-3xl text-storm-gold">+{battleResult.xpEarned} XP</p>
                  <p className="text-xs text-secondary-text font-ui">earned</p>
                </div>
              )}

              {/* Round breakdown */}
              {battleResult.rounds && battleResult.rounds.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-ui text-xs uppercase tracking-wider text-secondary-text mb-3">Round Breakdown</h3>
                  <div className="space-y-2">
                    {battleResult.rounds.map((r) => (
                      <div
                        key={r.round}
                        className="flex items-center justify-between bg-deep-navy/60 rounded-lg px-3 py-2 text-xs font-ui"
                      >
                        <span className="text-secondary-text">Round {r.round}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-arc-cyan">{r.playerAction}</span>
                          <span className="text-secondary-text">vs</span>
                          <span className="text-danger-red">{r.npcAction}</span>
                        </div>
                        <span className={r.winner === "player" ? "text-victory-green font-bold" : r.winner === "npc" ? "text-danger-red" : "text-secondary-text"}>
                          {r.winner === "player" ? "You win" : r.winner === "npc" ? "NPC wins" : "Draw"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setBattleResult(null)}
                className="btn-primary w-full"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
