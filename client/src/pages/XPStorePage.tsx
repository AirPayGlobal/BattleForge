import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

const XP_PACKS = [
  { name: "Starter", xp: 2500, usd: 2.99, bestValue: false, icon: "⚡" },
  { name: "Forge", xp: 10000, usd: 9.99, bestValue: true, icon: "🔥" },
  { name: "Arsenal", xp: 30000, usd: 24.99, bestValue: false, icon: "⚔️" },
  { name: "Forgemaster", xp: 100000, usd: 74.99, bestValue: false, icon: "👑" },
];

export default function XPStorePage() {
  const { player, refreshPlayer } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [buyingPass, setBuyingPass] = useState(false);

  const handleBuyPack = async (packName: string) => {
    setPurchasing(packName);
    try {
      const { data } = await api.post("/payments/xp-pack", { packName });
      if (data.devMode) {
        toast.success(`${data.xpGranted.toLocaleString()} XP credited! (dev mode)`);
        refreshPlayer();
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  const handleBuyPass = async () => {
    setBuyingPass(true);
    try {
      const { data } = await api.post("/payments/battle-pass");
      if (data.devMode) {
        toast.success("Battle Pass activated! (dev mode)");
        refreshPlayer();
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purchase failed");
    } finally {
      setBuyingPass(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-primary-text">XP STORE</h1>
        <p className="text-secondary-text font-ui text-sm">
          Your XP: <span className="text-storm-gold font-bold">{player?.xp.toLocaleString()}</span>
        </p>
      </div>

      {/* Battle Pass banner */}
      <div className="card border-void-purple/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-void-purple/10 to-arc-cyan/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-xl text-arc-cyan">BATTLE PASS</span>
              <span className="text-xs font-ui font-bold uppercase tracking-wider bg-storm-gold/20 text-storm-gold border border-storm-gold/30 rounded-full px-2 py-0.5">Season 1</span>
            </div>
            <p className="text-sm text-secondary-text font-ui">
              +25% XP from wins · Exclusive weapon skins · Priority matchmaking
            </p>
            <ul className="mt-2 space-y-1">
              {["100 tiers of exclusive rewards", "Seasonal weapon skins", "Priority arena matchmaking", "+25% XP multiplier on all wins"].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-xs text-secondary-text font-ui">
                  <span className="w-1.5 h-1.5 bg-arc-cyan rounded-full" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="font-display text-3xl text-storm-gold">$9.99</span>
            <button
              onClick={handleBuyPass}
              disabled={buyingPass}
              className="btn-secondary whitespace-nowrap"
            >
              {buyingPass ? "Processing..." : "Get Battle Pass"}
            </button>
          </div>
        </div>
      </div>

      {/* XP Packs */}
      <div>
        <h2 className="font-display text-xl text-primary-text mb-4">XP PACKS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {XP_PACKS.map((pack, i) => (
            <motion.div
              key={pack.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`card relative flex flex-col ${pack.bestValue ? "border-storm-gold" : ""}`}
              style={pack.bestValue ? { boxShadow: "0 0 20px rgba(255,214,0,0.1)" } : {}}
            >
              {pack.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-storm-gold text-deep-navy text-[10px] font-ui font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
              )}

              <div className="text-4xl mb-3 mt-1">{pack.icon}</div>
              <h3 className="font-display text-xl text-primary-text">{pack.name}</h3>
              <p className="font-display text-3xl text-storm-gold mt-1">
                {pack.xp.toLocaleString()}
                <span className="text-sm text-secondary-text ml-1">XP</span>
              </p>
              <p className="text-xs text-secondary-text font-ui mt-1">
                ${(pack.usd / pack.xp * 1000).toFixed(2)} per 1K XP
              </p>

              <div className="flex-1" />

              <button
                onClick={() => handleBuyPack(pack.name)}
                disabled={purchasing === pack.name}
                className={`mt-4 w-full ${pack.bestValue ? "btn-primary" : "btn-secondary"} py-2 text-sm`}
              >
                {purchasing === pack.name ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `$${pack.usd}`
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
