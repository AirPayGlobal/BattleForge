import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import {
  Weapon,
  WeaponRank,
  WeaponClass,
  RANK_ORDER,
  RANK_LABELS,
  RANK_COLORS,
  CLASS_LABELS,
} from "../lib/types";
import WeaponCard from "../components/WeaponCard";

const CLASSES: WeaponClass[] = [
  "BLADE",
  "POLEARM",
  "RANGED",
  "FORGE_ARTIFACT",
  "GAUNTLET",
];

export default function ArsenalPage() {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankFilter, setRankFilter] = useState<WeaponRank | "">("");
  const [classFilter, setClassFilter] = useState<WeaponClass | "">("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (rankFilter) params.set("rank", rankFilter);
    if (classFilter) params.set("weaponClass", classFilter);

    setLoading(true);
    api
      .get(`/weapons?${params}`)
      .then(({ data }) => setWeapons(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rankFilter, classFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary-text">ARSENAL</h1>
          <p className="text-secondary-text font-ui text-sm">
            {weapons.length} weapon{weapons.length !== 1 ? "s" : ""} in your
            collection
          </p>
        </div>
        <Link to="/forge" className="btn-primary">
          Forge New Weapon
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Rank Filter */}
        <select
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value as WeaponRank | "")}
          className="input-field w-auto text-sm"
        >
          <option value="">All Ranks</option>
          {RANK_ORDER.map((r) => (
            <option key={r} value={r}>
              {RANK_LABELS[r]}
            </option>
          ))}
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value as WeaponClass | "")}
          className="input-field w-auto text-sm"
        >
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {CLASS_LABELS[c]}
            </option>
          ))}
        </select>

        {(rankFilter || classFilter) && (
          <button
            onClick={() => {
              setRankFilter("");
              setClassFilter("");
            }}
            className="text-xs font-ui uppercase tracking-wider text-secondary-text hover:text-primary-text transition-colors px-3 py-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Weapon Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weapons.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4 opacity-30">&#x2694;&#xFE0F;</div>
          <h3 className="font-display text-xl text-primary-text mb-2">
            YOUR FORGE AWAITS
          </h3>
          <p className="text-secondary-text font-ui text-sm mb-6">
            {rankFilter || classFilter
              ? "No weapons match your filters."
              : "Craft your first weapon to begin your legacy."}
          </p>
          {!rankFilter && !classFilter && (
            <Link to="/forge" className="btn-primary">
              Start Forging
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weapons.map((w) => (
            <WeaponCard key={w.id} weapon={w} />
          ))}
        </div>
      )}
    </div>
  );
}
