import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Weapon, RANK_XP_COSTS, RANK_ORDER, RANK_LABELS, RANK_COLORS } from "../lib/types";
import WeaponCard from "../components/WeaponCard";

function getPlayerRankInfo(xp: number) {
  let currentRank = RANK_ORDER[0];
  let nextRank = RANK_ORDER[1];

  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    if (xp >= RANK_XP_COSTS[RANK_ORDER[i]]) {
      currentRank = RANK_ORDER[i];
      nextRank = RANK_ORDER[Math.min(i + 1, RANK_ORDER.length - 1)];
      break;
    }
  }

  const currentCost = RANK_XP_COSTS[currentRank];
  const nextCost = RANK_XP_COSTS[nextRank];
  const progress =
    currentRank === nextRank
      ? 100
      : Math.min(100, ((xp - currentCost) / (nextCost - currentCost)) * 100);

  return { currentRank, nextRank, progress: Math.max(0, progress) };
}

export default function DashboardPage() {
  const { player } = useAuth();
  const [recentWeapons, setRecentWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/weapons")
      .then(({ data }) => setRecentWeapons(data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!player) return null;

  const { currentRank, nextRank, progress } = getPlayerRankInfo(player.xp);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-4xl text-primary-text">
          WELCOME, {player.username.toUpperCase()}
        </h1>
        <p className="text-secondary-text font-ui mt-1">
          Your forge awaits, warrior.
        </p>
      </div>

      {/* XP Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-ui font-bold text-sm uppercase tracking-wider"
            style={{ color: RANK_COLORS[currentRank] }}
          >
            {RANK_LABELS[currentRank]}
          </span>
          {currentRank !== nextRank && (
            <span
              className="font-ui font-bold text-sm uppercase tracking-wider"
              style={{ color: RANK_COLORS[nextRank] }}
            >
              {RANK_LABELS[nextRank]}
            </span>
          )}
        </div>
        <div className="h-3 bg-deep-navy rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-xp-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-secondary-text font-ui">
            {player.xp.toLocaleString()} XP
          </span>
          {currentRank !== nextRank && (
            <span className="text-xs text-secondary-text font-ui">
              {RANK_XP_COSTS[nextRank].toLocaleString()} XP to unlock{" "}
              {RANK_LABELS[nextRank]}
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Win Streak", value: player.winStreak, icon: "\uD83D\uDD25" },
          {
            label: "Weapons Held",
            value: player.weaponCount ?? 0,
            icon: "\u2694\uFE0F",
          },
          {
            label: "Total XP",
            value: player.xp.toLocaleString(),
            icon: "\u2B50",
          },
          {
            label: "W / L",
            value: `${player.wins} / ${player.losses}`,
            icon: "\uD83C\uDFC6",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card flex flex-col items-center justify-center py-5"
          >
            <span className="text-2xl mb-1">{stat.icon}</span>
            <span className="font-display text-2xl text-storm-gold">
              {stat.value}
            </span>
            <span className="font-ui text-xs uppercase tracking-wider text-secondary-text mt-1">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/forge"
          className="card hover:border-arc-cyan/50 transition-colors group flex items-center gap-4 py-5"
        >
          <span className="text-3xl">&#x1F525;</span>
          <div>
            <h3 className="font-display text-lg text-primary-text group-hover:text-arc-cyan transition-colors">
              FORGE A WEAPON
            </h3>
            <p className="text-xs text-secondary-text font-ui">
              Spend XP to craft new weapons
            </p>
          </div>
        </Link>
        <Link
          to="/arena"
          className="card hover:border-void-purple/50 transition-colors group flex items-center gap-4 py-5"
        >
          <span className="text-3xl">&#x2694;&#xFE0F;</span>
          <div>
            <h3 className="font-display text-lg text-primary-text group-hover:text-void-purple transition-colors">
              ENTER THE ARENA
            </h3>
            <p className="text-xs text-secondary-text font-ui">
              Challenge opponents to duels
            </p>
          </div>
        </Link>
        <Link
          to="/arsenal"
          className="card hover:border-storm-gold/50 transition-colors group flex items-center gap-4 py-5"
        >
          <span className="text-3xl">&#x1F6E1;&#xFE0F;</span>
          <div>
            <h3 className="font-display text-lg text-primary-text group-hover:text-storm-gold transition-colors">
              YOUR ARSENAL
            </h3>
            <p className="text-xs text-secondary-text font-ui">
              View and manage your weapons
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Weapons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-primary-text">
            RECENT WEAPONS
          </h2>
          {recentWeapons.length > 0 && (
            <Link
              to="/arsenal"
              className="text-xs font-ui uppercase tracking-wider text-arc-cyan hover:text-arc-cyan/80"
            >
              View all
            </Link>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentWeapons.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-secondary-text font-ui">
              Your forge awaits — craft your first weapon
            </p>
            <Link to="/forge" className="btn-primary mt-4 inline-block">
              Start Forging
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentWeapons.map((w) => (
              <WeaponCard key={w.id} weapon={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
