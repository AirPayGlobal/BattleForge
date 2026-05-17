import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Weapon, RANK_XP_COSTS, RANK_ORDER, RANK_LABELS, RANK_COLORS } from "../lib/types";
import WeaponCard from "../components/WeaponCard";
import FighterSprite from "../components/FighterSprite";

interface BattleHistoryItem {
  type: "npc" | "pvp";
  result: "WIN" | "LOSS";
  opponent: string;
  xpEarned: number;
  date: string;
}

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
  const [battles, setBattles] = useState<BattleHistoryItem[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(true);

  useEffect(() => {
    api
      .get("/weapons")
      .then(({ data }) => setRecentWeapons(data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
    api
      .get("/players/me/battles")
      .then(({ data }) => setBattles(data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setBattlesLoading(false));
  }, []);

  if (!player) return null;

  const { currentRank, nextRank, progress } = getPlayerRankInfo(player.xp);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #0d0005 0%, #080010 50%, #0a000a 100%)",
          border: "1px solid rgba(255,61,107,0.2)",
          boxShadow: "0 0 40px rgba(255,61,107,0.08), inset 0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
          }}
        />
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(rgba(255,61,107,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,61,107,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative p-6 sm:p-8">
          {/* Name and rank */}
          <div className="text-center mb-4">
            <p className="font-ui text-xs uppercase tracking-[0.3em] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Welcome back, warrior
            </p>
            <motion.h1
              animate={{
                textShadow: [
                  "0 0 20px #FF3D6B80",
                  "0 0 35px #FF3D6BB0",
                  "0 0 20px #FF3D6B80",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="font-display text-4xl sm:text-5xl text-white tracking-widest uppercase"
            >
              {player.username.toUpperCase()}
            </motion.h1>
            <p
              className="font-ui text-sm mt-1 uppercase tracking-wider"
              style={{ color: RANK_COLORS[currentRank] }}
            >
              {RANK_LABELS[currentRank]}
            </p>
          </div>

          {/* Fighter sprite */}
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <FighterSprite
                character={player?.character?.name ?? "Ironclad"}
                side="left"
                action="idle"
                size={280}
              />
            </motion.div>
          </div>

          {/* Quick stats bar */}
          <div
            className="grid grid-cols-4 gap-2 rounded-xl px-4 py-3 mt-2"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { label: "XP", value: player.xp.toLocaleString(), color: "#FFD600" },
              { label: "Wins", value: player.wins, color: "#00FF9D" },
              { label: "Losses", value: player.losses, color: "#FF3D6B" },
              { label: "Streak", value: player.winStreak, color: "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-xl sm:text-2xl" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="font-ui text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Welcome text */}
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

      {/* Recent Battles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-primary-text">RECENT BATTLES</h2>
          <Link
            to="/arena"
            className="text-xs font-ui uppercase tracking-wider text-arc-cyan hover:text-arc-cyan/80"
          >
            View Arena →
          </Link>
        </div>
        {battlesLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : battles.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-secondary-text font-ui">
              No battles yet — enter the arena!
            </p>
            <Link to="/arena" className="btn-primary mt-4 inline-block">
              Enter Arena
            </Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {battles.map((battle, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {/* Result badge */}
                <span
                  className="font-ui font-bold text-xs uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0"
                  style={{
                    background: battle.result === "WIN" ? "rgba(0,255,157,0.15)" : "rgba(255,61,107,0.15)",
                    color: battle.result === "WIN" ? "#00FF9D" : "#FF3D6B",
                    border: `1px solid ${battle.result === "WIN" ? "rgba(0,255,157,0.3)" : "rgba(255,61,107,0.3)"}`,
                  }}
                >
                  {battle.result}
                </span>

                {/* Opponent */}
                <span className="font-ui text-sm text-primary-text flex-1 truncate">
                  vs {battle.opponent}
                </span>

                {/* Type badge */}
                <span
                  className="font-ui text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-flex"
                  style={{
                    background: battle.type === "pvp" ? "rgba(139,92,246,0.15)" : "rgba(245,158,11,0.15)",
                    color: battle.type === "pvp" ? "#a78bfa" : "#f59e0b",
                    border: `1px solid ${battle.type === "pvp" ? "rgba(139,92,246,0.25)" : "rgba(245,158,11,0.25)"}`,
                  }}
                >
                  {battle.type === "pvp" ? "PvP" : "NPC"}
                </span>

                {/* XP */}
                {battle.xpEarned > 0 && (
                  <span className="font-display text-sm flex-shrink-0" style={{ color: "#FFD600" }}>
                    +{battle.xpEarned} XP
                  </span>
                )}

                {/* Date */}
                <span className="font-ui text-xs text-secondary-text flex-shrink-0 hidden md:block">
                  {new Date(battle.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
