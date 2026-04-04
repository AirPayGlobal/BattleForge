import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import {
  Weapon, WeaponClass, WeaponRank,
  RANK_LABELS, RANK_COLORS, RANK_XP_COSTS, CLASS_LABELS, CLASS_ICONS,
} from "../lib/types";

// Mint XP costs (Rank IV+)
const MINT_XP_COSTS: Partial<Record<WeaponRank, number>> = {
  OBSIDIAN_IV: 5_000,
  VOID_V: 12_000,
  INFERNO_VI: 30_000,
  ETERNAL_VII: 80_000,
};
const PRINT_PRICES: Partial<Record<WeaponRank, number>> = {
  OBSIDIAN_IV: 18,
  VOID_V: 35,
  INFERNO_VI: 35,
  ETERNAL_VII: 75,
};
const PRINT_TIERS: Partial<Record<WeaponRank, string>> = {
  OBSIDIAN_IV: "Common",
  VOID_V: "Rare",
  INFERNO_VI: "Rare",
  ETERNAL_VII: "Legendary",
};

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "#FFD600",
  PRINTING: "#00E5FF",
  SHIPPED: "#7B2FFF",
  DELIVERED: "#00FF9D",
  CANCELLED: "#FF3D6B",
};

interface PrintOrder {
  id: string;
  status: string;
  mintSerial: string | null;
  priceUsd: number;
  trackingLink: string | null;
  createdAt: string;
  weapon: {
    id: string; name: string; class: string; rank: WeaponRank;
    mintSerialNumber: string | null; wins: number; losses: number;
  };
}

interface LimitInfo {
  limits: { rank: string; maxPrints: number; currentCount: number }[];
  activeSeason: { id: string; name: string; endDate: string } | null;
}

function MintModal({
  weapon,
  playerXp,
  onClose,
  onSuccess,
}: {
  weapon: Weapon;
  playerXp: number;
  onClose: () => void;
  onSuccess: (w: Weapon) => void;
}) {
  const [minting, setMinting] = useState(false);
  const xpCost = MINT_XP_COSTS[weapon.rank] ?? 0;
  const canAfford = playerXp >= xpCost;

  const handleMint = async () => {
    setMinting(true);
    try {
      const { data } = await api.post(`/weapons/${weapon.id}/mint`);
      toast.success(`${data.weapon.name} minted! Serial: ${data.mintSerial}`);
      onSuccess(data.weapon);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Mint failed");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative card w-full max-w-md z-10 space-y-4"
        style={{ borderColor: RANK_COLORS[weapon.rank] }}
      >
        <div className="text-center">
          <span className="text-4xl">{CLASS_ICONS[weapon.class]}</span>
          <h2 className="font-display text-2xl text-primary-text mt-2">{weapon.name}</h2>
          <p className="text-sm font-ui" style={{ color: RANK_COLORS[weapon.rank] }}>
            {RANK_LABELS[weapon.rank]} · {CLASS_LABELS[weapon.class]}
          </p>
        </div>

        <div className="bg-deep-navy rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-ui">
            <span className="text-secondary-text">Mint XP Cost</span>
            <span className="text-storm-gold font-bold">{xpCost.toLocaleString()} XP</span>
          </div>
          <div className="flex justify-between text-sm font-ui">
            <span className="text-secondary-text">Your XP</span>
            <span className={canAfford ? "text-victory-green font-bold" : "text-danger-red font-bold"}>
              {playerXp.toLocaleString()} XP
            </span>
          </div>
          <div className="border-t border-card-border pt-2 flex justify-between text-sm font-ui">
            <span className="text-secondary-text">After Mint</span>
            <span className="text-primary-text">{(playerXp - xpCost).toLocaleString()} XP</span>
          </div>
        </div>

        <p className="text-xs text-secondary-text font-ui text-center">
          Minting unlocks physical 3D printing. Your digital weapon remains in your arsenal permanently.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 text-sm">Cancel</button>
          <button
            onClick={handleMint}
            disabled={!canAfford || minting}
            className="flex-1 btn-primary py-2 text-sm"
          >
            {minting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-deep-navy border-t-transparent rounded-full animate-spin" />
                Minting...
              </span>
            ) : canAfford ? (
              "Mint to Physical"
            ) : (
              "Insufficient XP"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function OrderCard({ order }: { order: PrintOrder }) {
  const statusColor = STATUS_COLORS[order.status] ?? "#3A5080";

  return (
    <div className="card space-y-3">
      {/* Weapon info + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CLASS_ICONS[order.weapon.class as WeaponClass]}</span>
          <div>
            <h3 className="font-display text-lg text-primary-text leading-tight">
              {order.weapon.name}
            </h3>
            <p className="text-xs font-ui" style={{ color: RANK_COLORS[order.weapon.rank] }}>
              {RANK_LABELS[order.weapon.rank]}
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-ui font-bold uppercase tracking-wider rounded-full px-3 py-1 flex-shrink-0"
          style={{
            color: statusColor,
            backgroundColor: `${statusColor}20`,
            border: `1px solid ${statusColor}40`,
          }}
        >
          {order.status}
        </span>
      </div>

      {/* Serial */}
      <div className="bg-deep-navy rounded-lg px-3 py-2">
        <p className="text-[10px] text-secondary-text font-ui uppercase tracking-wider">Serial</p>
        <p className="font-mono text-storm-gold text-sm font-bold">{order.mintSerial ?? "—"}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs font-ui text-secondary-text">
        <span>${order.priceUsd}</span>
        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Tracking */}
      {order.trackingLink && (
        <a
          href={order.trackingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs font-ui text-arc-cyan hover:text-arc-cyan/80 transition-colors"
        >
          Track shipment →
        </a>
      )}

      {/* COA download */}
      {order.status === "DELIVERED" && (
        <a
          href={`/api/weapons/${order.weapon.id}/coa`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full text-xs py-2 text-center block"
        >
          Download Certificate of Authenticity
        </a>
      )}

      {/* W/L */}
      <div className="flex gap-3 text-xs font-ui">
        <span className="text-victory-green font-bold">{order.weapon.wins}W</span>
        <span className="text-secondary-text">/</span>
        <span className="text-danger-red font-bold">{order.weapon.losses}L</span>
      </div>
    </div>
  );
}

export default function ForgeRoomPage() {
  const { player } = useAuth();
  const [mintedWeapons, setMintedWeapons] = useState<Weapon[]>([]);
  const [eligibleWeapons, setEligibleWeapons] = useState<Weapon[]>([]);
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mintTarget, setMintTarget] = useState<Weapon | null>(null);
  const [tab, setTab] = useState<"mint" | "orders" | "minted">("mint");

  useEffect(() => {
    Promise.all([
      api.get("/weapons/minted/list"),
      api.get("/weapons"),
      api.get("/print-orders/my"),
      api.get("/print-run-limits"),
    ])
      .then(([minted, all, ordersRes, limits]) => {
        setMintedWeapons(minted.data);
        setEligibleWeapons(
          all.data.filter(
            (w: Weapon) =>
              ["OBSIDIAN_IV", "VOID_V", "INFERNO_VI", "ETERNAL_VII"].includes(w.rank) &&
              !w.printMinted
          )
        );
        setOrders(ordersRes.data);
        setLimitInfo(limits.data);
      })
      .catch(() => toast.error("Failed to load Forge Room"))
      .finally(() => setLoading(false));
  }, []);

  const legendaryLimit = limitInfo?.limits.find((l) => l.rank === "ETERNAL_VII");
  const legendaryRemaining = legendaryLimit
    ? legendaryLimit.maxPrints - legendaryLimit.currentCount
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary-text">THE FORGE ROOM</h1>
          <p className="text-secondary-text font-ui text-sm">
            Mint your weapons into physical reality. Each print is singular.
          </p>
        </div>
        {legendaryRemaining !== null && (
          <div className="card border-storm-gold/40 text-center px-4 py-2 flex-shrink-0">
            <p className="font-display text-2xl text-storm-gold">{legendaryRemaining}</p>
            <p className="font-ui text-[10px] text-secondary-text uppercase tracking-wider">
              Eternal prints remaining this season
            </p>
            <div className="mt-1 h-1.5 bg-deep-navy rounded-full overflow-hidden w-32">
              <div
                className="h-full bg-gradient-to-r from-void-purple to-storm-gold rounded-full"
                style={{ width: `${(legendaryRemaining / (legendaryLimit?.maxPrints ?? 100)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-card-border">
        {[
          { key: "mint", label: "Eligible Weapons" },
          { key: "minted", label: `Minted (${mintedWeapons.length})` },
          { key: "orders", label: `Print Orders (${orders.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`font-ui font-bold uppercase tracking-wider text-xs px-4 py-2 border-b-2 transition-colors ${
              tab === t.key
                ? "text-arc-cyan border-arc-cyan"
                : "text-secondary-text border-transparent hover:text-primary-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Eligible for Mint */}
      {tab === "mint" && (
        <div>
          {eligibleWeapons.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3 opacity-30">🔩</div>
              <h3 className="font-display text-xl text-primary-text mb-2">NO ELIGIBLE WEAPONS</h3>
              <p className="text-secondary-text font-ui text-sm mb-4">
                Craft a Rank IV+ weapon to unlock physical printing.
              </p>
              <Link to="/forge" className="btn-primary">Go to Forge</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eligibleWeapons.map((weapon, i) => {
                const xpCost = MINT_XP_COSTS[weapon.rank] ?? 0;
                const printPrice = PRINT_PRICES[weapon.rank] ?? 0;
                const tier = PRINT_TIERS[weapon.rank] ?? "";
                const canAfford = (player?.xp ?? 0) >= xpCost;

                return (
                  <motion.div
                    key={weapon.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="card relative overflow-hidden"
                    style={{ borderColor: RANK_COLORS[weapon.rank] }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: RANK_COLORS[weapon.rank] }}
                    />

                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{CLASS_ICONS[weapon.class]}</span>
                        <span
                          className="text-[10px] font-ui font-bold uppercase tracking-wider rounded px-2 py-0.5"
                          style={{
                            color: RANK_COLORS[weapon.rank],
                            backgroundColor: `${RANK_COLORS[weapon.rank]}20`,
                            border: `1px solid ${RANK_COLORS[weapon.rank]}40`,
                          }}
                        >
                          {RANK_LABELS[weapon.rank]}
                        </span>
                        <span className="ml-auto text-[10px] font-ui text-secondary-text uppercase">{tier}</span>
                      </div>

                      <h3 className="font-display text-xl text-primary-text">{weapon.name}</h3>
                      <p className="text-xs text-secondary-text font-ui">{CLASS_LABELS[weapon.class]}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs font-ui">
                        <span className="text-victory-green">{weapon.wins}W</span>
                        <span className="text-secondary-text">/</span>
                        <span className="text-danger-red">{weapon.losses}L</span>
                      </div>

                      <div className="mt-3 space-y-1.5 bg-deep-navy rounded-lg p-3">
                        <div className="flex justify-between text-xs font-ui">
                          <span className="text-secondary-text">Mint cost</span>
                          <span className={canAfford ? "text-storm-gold font-bold" : "text-danger-red font-bold"}>
                            {xpCost.toLocaleString()} XP
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-ui">
                          <span className="text-secondary-text">Print fulfillment</span>
                          <span className="text-primary-text">${printPrice}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setMintTarget(weapon)}
                        disabled={!canAfford}
                        className="btn-primary w-full mt-3 text-sm py-2"
                      >
                        {canAfford ? "Mint to Physical" : "Need More XP"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Already Minted */}
      {tab === "minted" && (
        <div>
          {mintedWeapons.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3 opacity-30">🏺</div>
              <h3 className="font-display text-xl text-primary-text mb-2">NOTHING MINTED YET</h3>
              <p className="text-secondary-text font-ui text-sm">
                Mint a Rank IV+ weapon to unlock physical printing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mintedWeapons.map((weapon, i) => (
                <motion.div
                  key={weapon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card relative overflow-hidden"
                  style={{ borderColor: RANK_COLORS[weapon.rank] }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: RANK_COLORS[weapon.rank] }} />
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{CLASS_ICONS[weapon.class]}</span>
                      <span
                        className="text-[10px] font-ui font-bold uppercase tracking-wider rounded px-2 py-0.5"
                        style={{ color: RANK_COLORS[weapon.rank], backgroundColor: `${RANK_COLORS[weapon.rank]}20`, border: `1px solid ${RANK_COLORS[weapon.rank]}40` }}
                      >
                        {RANK_LABELS[weapon.rank]}
                      </span>
                      <span className="ml-auto text-[10px] bg-victory-green/20 text-victory-green border border-victory-green/30 rounded-full px-2 py-0.5 font-ui font-bold uppercase">
                        Minted
                      </span>
                    </div>
                    <h3 className="font-display text-xl text-primary-text">{weapon.name}</h3>
                    <p className="font-mono text-[10px] text-storm-gold mt-1">{(weapon as any).mintSerialNumber}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-ui">
                      <span className="text-victory-green">{weapon.wins}W</span>
                      <span className="text-secondary-text">/</span>
                      <span className="text-danger-red">{weapon.losses}L</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <a
                        href={`/api/weapons/${weapon.id}/coa`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-ui font-bold uppercase tracking-wider py-2 rounded-lg border border-storm-gold/50 text-storm-gold hover:bg-storm-gold/10 transition-colors"
                      >
                        Download COA
                      </a>
                      <Link
                        to={`/weapon/${weapon.id}/public`}
                        className="flex-1 text-center text-xs font-ui font-bold uppercase tracking-wider py-2 rounded-lg border border-arc-cyan/50 text-arc-cyan hover:bg-arc-cyan/10 transition-colors"
                      >
                        Public Profile
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Print Orders */}
      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3 opacity-30">📦</div>
              <h3 className="font-display text-xl text-primary-text mb-2">NO PRINT ORDERS</h3>
              <p className="text-secondary-text font-ui text-sm">
                Mint a weapon then place a print order to get it forged in the real world.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <OrderCard order={order} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mint Modal */}
      <AnimatePresence>
        {mintTarget && (
          <MintModal
            weapon={mintTarget}
            playerXp={player?.xp ?? 0}
            onClose={() => setMintTarget(null)}
            onSuccess={(w) => {
              setMintedWeapons((prev) => [w, ...prev]);
              setEligibleWeapons((prev) => prev.filter((x) => x.id !== w.id));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
