import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  questChainName: string;
  active: boolean;
  tiers: BattlePassTier[];
}

interface BattlePassTier {
  id: string;
  tier: number;
  rewardType: string;
  rewardData: { label: string; icon?: string };
  xpRequired: number;
  isPaid: boolean;
}

interface PassState {
  currentTier: number;
  xpEarned: number;
}

const REWARD_ICONS: Record<string, string> = {
  XP: "⭐",
  WEAPON_SKIN: "🎨",
  TITLE: "📜",
  BADGE: "🏅",
  XP_BOOST: "🔥",
};

function SeasonTimer({ endDate }: { endDate: string }) {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);

  return (
    <div className="flex items-center gap-2 text-sm font-ui">
      <span className="text-secondary-text">Season ends in:</span>
      <span className="text-storm-gold font-bold">
        {days}d {hours}h
      </span>
    </div>
  );
}

export default function BattlePassPage() {
  const { player } = useAuth();
  const navigate = useNavigate();
  const [season, setSeason] = useState<Season | null>(null);
  const [pass, setPass] = useState<PassState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/seasons/active"), api.get("/seasons/active/pass")])
      .then(([s, p]) => {
        setSeason(s.data);
        setPass(p.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3 opacity-30">🏆</div>
        <h3 className="font-display text-xl text-primary-text mb-2">NO ACTIVE SEASON</h3>
        <p className="text-secondary-text font-ui text-sm">The next season is coming soon.</p>
      </div>
    );
  }

  const currentTier = pass?.currentTier ?? 0;
  const hasBattlePass = !!pass;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-void-purple/10 to-arc-cyan/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl text-primary-text">BATTLE PASS</h1>
              <span className="text-xs font-ui font-bold uppercase tracking-wider bg-void-purple/20 text-void-purple border border-void-purple/30 rounded-full px-2 py-0.5">
                {season.name}
              </span>
            </div>
            <SeasonTimer endDate={season.endDate} />
            {hasBattlePass ? (
              <p className="text-victory-green font-ui text-sm mt-1 font-bold">✓ Battle Pass Active</p>
            ) : (
              <p className="text-secondary-text font-ui text-sm mt-1">Free tier only — upgrade for full access</p>
            )}
          </div>
          {!hasBattlePass && (
            <button onClick={() => navigate("/store")} className="btn-primary flex-shrink-0">
              Get Battle Pass — $9.99
            </button>
          )}
        </div>

        {/* XP progress */}
        {hasBattlePass && (
          <div className="mt-4 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="font-ui text-xs text-secondary-text uppercase tracking-wider">
                Tier {currentTier} / {season.tiers.length}
              </span>
              <span className="font-ui text-xs text-arc-cyan">
                {pass?.xpEarned?.toLocaleString() ?? 0} XP earned
              </span>
            </div>
            <div className="h-3 bg-deep-navy rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-xp-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentTier / (season.tiers.length || 100)) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two lane tier track: Free + Paid */}
      {season.tiers.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-secondary-text font-ui">No tiers available for this season yet.</p>
        </div>
      ) : (
        <div>
          <div className="flex gap-4 mb-3">
            <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">Free Track</span>
            <span className="font-ui text-xs uppercase tracking-wider text-void-purple">Paid Track</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-4">
              {season.tiers.map((tier) => {
                const unlocked = currentTier >= tier.tier;
                const isCurrentTier = currentTier + 1 === tier.tier;
                const canAccess = !tier.isPaid || hasBattlePass;

                return (
                  <div key={tier.id} className="flex flex-col items-center gap-1">
                    {/* Tier number */}
                    <span className="font-ui text-[10px] text-secondary-text">{tier.tier}</span>

                    {/* Reward box */}
                    <motion.div
                      className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-default ${
                        unlocked && canAccess
                          ? tier.isPaid
                            ? "border-void-purple bg-void-purple/20"
                            : "border-victory-green bg-victory-green/10"
                          : isCurrentTier
                          ? "border-arc-cyan bg-arc-cyan/10"
                          : "border-card-border opacity-50"
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-xl">
                        {!canAccess ? "🔒" : (REWARD_ICONS[tier.rewardType] ?? "🎁")}
                      </span>
                      <span className="font-ui text-[9px] text-secondary-text text-center leading-tight mt-0.5 px-1">
                        {canAccess ? (tier.rewardData?.label ?? tier.rewardType) : "Paid"}
                      </span>
                    </motion.div>

                    {/* Track lane indicator */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: tier.isPaid ? "#7B2FFF" : "#1A2545",
                        opacity: canAccess ? 1 : 0.4,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
