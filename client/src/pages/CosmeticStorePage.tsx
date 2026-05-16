import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { CharacterCosmetic, PlayerCosmetic } from "../lib/types";

type Tab = "ALL" | "SKIN" | "ACCESSORY" | "MOD";

const TAB_LABELS: Record<Tab, string> = {
  ALL: "All",
  SKIN: "Skins",
  ACCESSORY: "Accessories",
  MOD: "Mods",
};

const TYPE_ICONS: Record<string, string> = {
  SKIN: "🎨",
  ACCESSORY: "💎",
  MOD: "✨",
};

export default function CosmeticStorePage() {
  const { player, refreshPlayer } = useAuth();
  const [cosmetics, setCosmetics] = useState<CharacterCosmetic[]>([]);
  const [ownedCosmetics, setOwnedCosmetics] = useState<PlayerCosmetic[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/cosmetics"),
      api.get("/players/cosmetics"),
    ])
      .then(([storeRes, ownedRes]) => {
        setCosmetics(storeRes.data);
        setOwnedCosmetics(ownedRes.data);
      })
      .catch(() => toast.error("Failed to load cosmetics"))
      .finally(() => setLoading(false));
  }, []);

  const ownedSet = new Set(ownedCosmetics.map((c) => c.cosmeticId));

  const filtered = cosmetics.filter(
    (c) => activeTab === "ALL" || c.type === activeTab
  );

  const handleBuyXp = async (cosmetic: CharacterCosmetic) => {
    if (purchasing) return;
    if (!cosmetic.xpPrice) return;
    if ((player?.xp ?? 0) < cosmetic.xpPrice) {
      toast.error(`Insufficient XP. You need ${cosmetic.xpPrice.toLocaleString()} XP.`);
      return;
    }
    setPurchasing(cosmetic.id);
    try {
      const { data } = await api.post(`/cosmetics/${cosmetic.id}/purchase/xp`);
      setOwnedCosmetics((prev) => [...prev, data]);
      await refreshPlayer();
      toast.success(`${cosmetic.name} purchased for ${cosmetic.xpPrice!.toLocaleString()} XP!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  const handleBuyUsd = async (cosmetic: CharacterCosmetic) => {
    if (purchasing) return;
    setPurchasing(cosmetic.id);
    try {
      const { data } = await api.post(`/cosmetics/${cosmetic.id}/purchase/stripe`);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.devMode) {
        setOwnedCosmetics((prev) => [...prev, data.playerCosmetic]);
        toast.success(`${cosmetic.name} purchased! (dev mode)`);
      } else {
        toast("Payment flow coming soon!", { icon: "🚧" });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Purchase failed");
    } finally {
      setPurchasing(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary-text">COSMETIC STORE</h1>
          <p className="text-secondary-text font-ui text-sm">
            Your XP: <span className="text-storm-gold font-bold">{player?.xp.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-card-border">
        {(["ALL", "SKIN", "ACCESSORY", "MOD"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-ui text-xs uppercase tracking-wider font-bold border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "text-arc-cyan border-arc-cyan"
                : "text-secondary-text border-transparent hover:text-primary-text"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Cosmetics Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-secondary-text font-ui">No cosmetics in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cosmetic, i) => {
            const owned = ownedSet.has(cosmetic.id);
            const canAffordXp = (player?.xp ?? 0) >= (cosmetic.xpPrice ?? 0);
            return (
              <motion.div
                key={cosmetic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`card flex flex-col ${owned ? "opacity-80" : ""}`}
              >
                {/* Type badge + Owned badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-ui font-bold uppercase tracking-wider text-secondary-text">
                    <span>{TYPE_ICONS[cosmetic.type]}</span>
                    {cosmetic.type}
                  </span>
                  {owned && (
                    <span className="text-[10px] font-ui font-bold uppercase tracking-wider bg-victory-green/20 text-victory-green border border-victory-green/30 rounded-full px-2 py-0.5">
                      Owned
                    </span>
                  )}
                </div>

                {/* Cosmetic image placeholder */}
                <div className="w-full h-28 bg-deep-navy rounded-lg flex items-center justify-center mb-3">
                  <span className="text-4xl">{TYPE_ICONS[cosmetic.type]}</span>
                </div>

                <h3 className="font-display text-lg text-primary-text">{cosmetic.name}</h3>
                {cosmetic.character && (
                  <p className="text-[10px] font-ui text-arc-cyan uppercase tracking-wider mb-1">
                    {cosmetic.character.name} only
                  </p>
                )}
                <p className="text-xs text-secondary-text font-ui flex-1 mt-1 mb-3">{cosmetic.description}</p>

                {/* Price and buy buttons */}
                {owned ? (
                  <div className="mt-auto">
                    <p className="text-center text-xs font-ui text-secondary-text py-2">Already in your collection</p>
                  </div>
                ) : (
                  <div className="mt-auto space-y-2">
                    {cosmetic.xpPrice && (
                      <button
                        onClick={() => handleBuyXp(cosmetic)}
                        disabled={purchasing === cosmetic.id || !canAffordXp}
                        className={`w-full btn-secondary text-sm py-2 ${!canAffordXp ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {purchasing === cosmetic.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span>
                            Buy for <span className="text-storm-gold font-bold">{cosmetic.xpPrice.toLocaleString()} XP</span>
                          </span>
                        )}
                      </button>
                    )}
                    {cosmetic.usdPrice && (
                      <button
                        onClick={() => handleBuyUsd(cosmetic)}
                        disabled={purchasing === cosmetic.id}
                        className="w-full btn-primary text-sm py-2"
                      >
                        {purchasing === cosmetic.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          `Buy for $${cosmetic.usdPrice.toFixed(2)}`
                        )}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
