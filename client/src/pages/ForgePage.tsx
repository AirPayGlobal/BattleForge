import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import {
  Weapon,
  WeaponClass,
  WeaponRank,
  RANK_ORDER,
  RANK_LABELS,
  RANK_COLORS,
  RANK_XP_COSTS,
  CLASS_LABELS,
  CLASS_ICONS,
} from "../lib/types";
import WeaponCard from "../components/WeaponCard";

const CRAFTABLE_CLASSES: WeaponClass[] = ["BLADE", "POLEARM", "RANGED"];

export default function ForgePage() {
  const { player, refreshPlayer } = useAuth();
  const [selectedClass, setSelectedClass] = useState<WeaponClass | null>(null);
  const [selectedRank, setSelectedRank] = useState<WeaponRank | null>(null);
  const [weaponName, setWeaponName] = useState("");
  const [crafting, setCrafting] = useState(false);
  const [craftedWeapon, setCraftedWeapon] = useState<Weapon | null>(null);

  if (!player) return null;

  const xpCost = selectedRank ? RANK_XP_COSTS[selectedRank] : 0;
  const canAfford = player.xp >= xpCost;
  const canCraft =
    selectedClass && selectedRank && weaponName.length >= 2 && canAfford && !crafting;

  const handleCraft = async () => {
    if (!canCraft) return;
    setCrafting(true);
    setCraftedWeapon(null);

    // Simulate forge animation delay
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const { data } = await api.post("/forge/craft", {
        name: weaponName,
        weaponClass: selectedClass,
        rank: selectedRank,
      });
      setCraftedWeapon(data);
      toast.success(`${data.name} forged successfully!`);
      await refreshPlayer();
      // Reset form
      setWeaponName("");
      setSelectedClass(null);
      setSelectedRank(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Crafting failed");
    } finally {
      setCrafting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary-text">THE FORGE</h1>
        <p className="text-secondary-text font-ui text-sm">
          Spend XP to craft powerful weapons. Choose wisely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Craft Form */}
        <div className="space-y-5">
          {/* Weapon Name */}
          <div className="card">
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-2">
              Weapon Name
            </label>
            <input
              type="text"
              value={weaponName}
              onChange={(e) => setWeaponName(e.target.value)}
              className="input-field"
              placeholder="Name your weapon..."
              maxLength={30}
            />
          </div>

          {/* Class Selection */}
          <div className="card">
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-3">
              Weapon Class
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CRAFTABLE_CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    selectedClass === cls
                      ? "border-arc-cyan bg-arc-cyan/10"
                      : "border-card-border hover:border-secondary-text"
                  }`}
                >
                  <span className="text-2xl block mb-1">
                    {CLASS_ICONS[cls]}
                  </span>
                  <span className="font-ui text-xs uppercase tracking-wider text-primary-text">
                    {CLASS_LABELS[cls]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Rank Selection */}
          <div className="card">
            <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-3">
              Weapon Rank
            </label>
            <div className="space-y-2">
              {RANK_ORDER.map((rank) => {
                const cost = RANK_XP_COSTS[rank];
                const affordable = player.xp >= cost;
                return (
                  <button
                    key={rank}
                    onClick={() => affordable && setSelectedRank(rank)}
                    disabled={!affordable}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedRank === rank
                        ? "border-arc-cyan bg-arc-cyan/10"
                        : affordable
                        ? "border-card-border hover:border-secondary-text"
                        : "border-card-border opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: RANK_COLORS[rank] }}
                      />
                      <span className="font-ui text-sm font-semibold text-primary-text">
                        {RANK_LABELS[rank]}
                      </span>
                    </div>
                    <span
                      className={`font-ui text-sm font-bold ${
                        affordable ? "text-storm-gold" : "text-secondary-text"
                      }`}
                    >
                      {cost.toLocaleString()} XP
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Preview + Craft */}
        <div className="space-y-5">
          {/* XP Info */}
          <div className="card">
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">
                Your XP
              </span>
              <span className="font-display text-2xl text-storm-gold">
                {player.xp.toLocaleString()}
              </span>
            </div>
            {selectedRank && (
              <div className="mt-3 pt-3 border-t border-card-border">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">
                    Craft Cost
                  </span>
                  <span
                    className={`font-display text-xl ${
                      canAfford ? "text-danger-red" : "text-danger-red"
                    }`}
                  >
                    -{xpCost.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-ui text-xs uppercase tracking-wider text-secondary-text">
                    Remaining
                  </span>
                  <span
                    className={`font-ui text-sm font-bold ${
                      canAfford ? "text-victory-green" : "text-danger-red"
                    }`}
                  >
                    {(player.xp - xpCost).toLocaleString()} XP
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Craft Button */}
          <button
            onClick={handleCraft}
            disabled={!canCraft}
            className={`w-full py-5 rounded-xl font-display text-2xl uppercase tracking-wider transition-all ${
              crafting
                ? "bg-void-purple/30 text-void-purple forge-glow"
                : canCraft
                ? "bg-gradient-to-r from-void-purple to-arc-cyan text-white hover:brightness-110 active:scale-[0.98]"
                : "bg-card-surface text-secondary-text border border-card-border cursor-not-allowed"
            }`}
          >
            {crafting ? (
              <span className="flex items-center justify-center gap-3">
                <span className="forge-fire inline-block">&#x1F525;</span>
                FORGING...
                <span className="forge-fire inline-block">&#x1F525;</span>
              </span>
            ) : (
              "FORGE WEAPON"
            )}
          </button>

          {/* Crafted Weapon Result */}
          <AnimatePresence>
            {craftedWeapon && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl opacity-30 blur-xl"
                    style={{
                      backgroundColor: RANK_COLORS[craftedWeapon.rank],
                    }}
                  />
                  <div className="relative">
                    <p className="font-display text-sm text-victory-green text-center mb-2">
                      WEAPON FORGED SUCCESSFULLY
                    </p>
                    <WeaponCard weapon={craftedWeapon} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview (when no crafted weapon shown) */}
          {!craftedWeapon && selectedClass && selectedRank && weaponName && (
            <div className="card border-dashed opacity-60">
              <p className="font-ui text-xs uppercase tracking-wider text-secondary-text mb-2">
                Preview
              </p>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RANK_COLORS[selectedRank] }}
                />
                <span
                  className="text-[10px] font-ui font-bold uppercase tracking-wider"
                  style={{ color: RANK_COLORS[selectedRank] }}
                >
                  {RANK_LABELS[selectedRank]}
                </span>
              </div>
              <h3 className="font-display text-xl text-primary-text">
                {weaponName}
              </h3>
              <p className="text-xs text-secondary-text font-ui">
                {CLASS_ICONS[selectedClass]} {CLASS_LABELS[selectedClass]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
