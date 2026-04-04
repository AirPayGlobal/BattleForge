import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../lib/api";

interface QuestData {
  id: string;
  currentStage: number;
  stageData: Record<string, any>;
  completedAt: string | null;
  playerId: string;
}

const STAGES = [
  {
    n: 1,
    title: "Iron Trial",
    desc: "Win 5 ranked duels with a Rank I weapon. No Forge Shield.",
    icon: "⚔️",
  },
  {
    n: 2,
    title: "Taste of Defeat",
    desc: "Deliberately lose a ranked duel without Forge Shield active.",
    icon: "💀",
  },
  {
    n: 3,
    title: "The Three Paths",
    desc: "Forge one Blade, one Polearm, and one Ranged weapon using earned XP.",
    icon: "🔱",
  },
  {
    n: 4,
    title: "Witness the Legend",
    desc: "Watch a live Gauntlet duel in spectator mode.",
    icon: "👁️",
  },
  {
    n: 5,
    title: "David & Goliath",
    desc: "Win a duel against a player ranked 2+ ranks above you, using a Rank I weapon.",
    icon: "🏹",
  },
  {
    n: 6,
    title: "Void Forger",
    desc: "Craft a Rank V (Void) weapon.",
    icon: "🌀",
  },
  {
    n: 7,
    title: "The Final Trial",
    desc: "Use your temporary Gauntlet to win a duel. Lose and return to Stage 5.",
    icon: "👊",
    warning: true,
  },
];

export default function QuestChainPage() {
  const [quest, setQuest] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api
      .get("/quest/status")
      .then(({ data }) => setQuest(data))
      .catch(() => toast.error("Failed to load quest"))
      .finally(() => setLoading(false));
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { data } = await api.post("/quest/check");
      if (data.stageCompleted) {
        if (data.questCompleted) {
          toast.success("🏆 THE GAUNTLET IS YOURS!");
        } else {
          toast.success(`Stage ${quest?.currentStage} complete! Moving to Stage ${data.nextStage}`);
        }
        setQuest(data.quest);
      } else {
        toast(data.hint, { icon: "💡" });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Check failed");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStage = quest?.currentStage ?? 1;
  const completed = !!quest?.completedAt;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary-text">GAUNTLET QUEST CHAIN</h1>
        <p className="text-secondary-text font-ui text-sm">
          Complete all 7 stages to earn The Gauntlet — a legendary weapon that never sleeps.
        </p>
      </div>

      {completed ? (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="card border-storm-gold text-center py-10"
          style={{ boxShadow: "0 0 40px rgba(255,214,0,0.2)" }}
        >
          <div className="text-6xl mb-4">👊</div>
          <h2 className="font-display text-4xl text-storm-gold">QUEST COMPLETE</h2>
          <p className="text-secondary-text font-ui mt-2">
            The Gauntlet has been forged. Your legend is written.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">Progress</span>
              <span className="font-ui text-xs text-arc-cyan font-bold">Stage {currentStage} / 7</span>
            </div>
            <div className="h-2 bg-deep-navy rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-xp-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStage - 1) / 7) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Check button */}
          <button
            onClick={handleCheck}
            disabled={checking}
            className="btn-primary w-full"
          >
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-deep-navy border-t-transparent rounded-full animate-spin" />
                Checking stage...
              </span>
            ) : (
              `Check Stage ${currentStage} Progress`
            )}
          </button>
        </>
      )}

      {/* Stage tracker — vertical stepper */}
      <div className="space-y-2">
        {STAGES.map((stage, i) => {
          const stageNum = stage.n;
          const isDone = completed || currentStage > stageNum;
          const isCurrent = currentStage === stageNum && !completed;
          const isLocked = currentStage < stageNum;

          return (
            <motion.div
              key={stageNum}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`card flex items-start gap-4 transition-all ${
                isCurrent
                  ? "border-arc-cyan"
                  : isDone
                  ? "border-victory-green/40"
                  : "opacity-50"
              }`}
              style={
                isCurrent
                  ? { boxShadow: "0 0 15px rgba(0,229,255,0.1)" }
                  : stage.warning && isCurrent
                  ? { borderColor: "#FF3D6B" }
                  : {}
              }
            >
              {/* Status icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${
                  isDone
                    ? "bg-victory-green/20 border border-victory-green"
                    : isCurrent
                    ? "bg-arc-cyan/20 border-2 border-arc-cyan"
                    : "bg-deep-navy border border-card-border"
                }`}
              >
                {isDone ? "✓" : isCurrent ? stage.icon : stage.n}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-display text-lg ${
                      isDone
                        ? "text-victory-green"
                        : isCurrent
                        ? "text-arc-cyan"
                        : "text-secondary-text"
                    }`}
                  >
                    {stage.title}
                  </h3>
                  {stage.warning && (
                    <span className="text-[10px] font-ui font-bold uppercase bg-danger-red/20 text-danger-red border border-danger-red/30 rounded-full px-2 py-0.5">
                      High Stakes
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm font-ui mt-0.5 ${
                    isCurrent ? "text-primary-text" : "text-secondary-text"
                  }`}
                >
                  {stage.desc}
                </p>
              </div>

              {/* Stage label */}
              <div className="flex-shrink-0">
                <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">
                  Stage {stageNum}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
