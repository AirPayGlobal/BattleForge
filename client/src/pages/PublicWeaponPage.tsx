import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { RANK_LABELS, RANK_COLORS, CLASS_LABELS, CLASS_ICONS } from "../lib/types";

interface PublicDuel {
  id: string;
  challenger: string;
  defender: string;
  winnerId: string | null;
  completedAt: string | null;
}

interface PublicWeapon {
  id: string;
  name: string;
  class: string;
  rank: string;
  wins: number;
  losses: number;
  serialNumber: string;
  mintSerialNumber: string | null;
  printMinted: boolean;
  mintedAt: string | null;
  createdAt: string;
  owner: { id: string; username: string };
  recentDuels: PublicDuel[];
}

export default function PublicWeaponPage() {
  const { id } = useParams<{ id: string }>();
  const [weapon, setWeapon] = useState<PublicWeapon | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${(import.meta as any).env?.VITE_API_URL || "http://localhost:3001"}/api/weapons/${id}/public`)
      .then((r) => setWeapon(r.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !weapon) {
    return (
      <div className="min-h-screen bg-deep-navy flex flex-col items-center justify-center gap-4">
        <p className="font-display text-4xl text-arc-cyan">WEAPON NOT FOUND</p>
        <Link to="/" className="font-ui text-secondary-text hover:text-primary-text underline text-sm">
          Return home
        </Link>
      </div>
    );
  }

  const rankColor = RANK_COLORS[weapon.rank as keyof typeof RANK_COLORS] ?? "#6B7280";
  const rankLabel = RANK_LABELS[weapon.rank as keyof typeof RANK_LABELS] ?? weapon.rank;
  const classLabel = CLASS_LABELS[weapon.class as keyof typeof CLASS_LABELS] ?? weapon.class;
  const classIcon = CLASS_ICONS[weapon.class as keyof typeof CLASS_ICONS] ?? "⚔️";
  const winRate = weapon.wins + weapon.losses > 0
    ? Math.round((weapon.wins / (weapon.wins + weapon.losses)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-deep-navy text-primary-text">
      {/* Top gradient bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-void-purple to-arc-cyan" />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="font-ui text-xs uppercase tracking-widest text-secondary-text">
            BattleForge — Weapon Profile
          </p>
          <h1 className="font-display text-5xl tracking-wide" style={{ color: rankColor }}>
            {weapon.name.toUpperCase()}
          </h1>
          <p className="font-ui text-sm text-secondary-text">
            {classIcon} {classLabel} &nbsp;·&nbsp;
            <span style={{ color: rankColor }}>{rankLabel}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-card-surface border border-card-border rounded-xl overflow-hidden">
          {/* Rank color strip */}
          <div className="h-1 w-full" style={{ backgroundColor: rankColor }} />

          <div className="p-6 space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-deep-navy rounded-lg p-3">
                <p className="font-display text-3xl text-victory-green">{weapon.wins}</p>
                <p className="font-ui text-[10px] uppercase tracking-widest text-secondary-text mt-0.5">Victories</p>
              </div>
              <div className="bg-deep-navy rounded-lg p-3">
                <p className="font-display text-3xl text-arc-cyan">{winRate}%</p>
                <p className="font-ui text-[10px] uppercase tracking-widest text-secondary-text mt-0.5">Win Rate</p>
              </div>
              <div className="bg-deep-navy rounded-lg p-3">
                <p className="font-display text-3xl text-danger-red">{weapon.losses}</p>
                <p className="font-ui text-[10px] uppercase tracking-widest text-secondary-text mt-0.5">Defeats</p>
              </div>
            </div>

            {/* Owner + serial */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-card-border">
                <span className="font-ui text-secondary-text uppercase tracking-wide text-xs">Owner</span>
                <span className="font-ui font-semibold text-primary-text">{weapon.owner.username}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-card-border">
                <span className="font-ui text-secondary-text uppercase tracking-wide text-xs">Serial</span>
                <span className="font-mono text-xs text-secondary-text">{weapon.serialNumber}</span>
              </div>
              {weapon.printMinted && weapon.mintSerialNumber && (
                <div className="flex justify-between items-center py-2 border-b border-card-border">
                  <span className="font-ui text-secondary-text uppercase tracking-wide text-xs">Mint Serial</span>
                  <span className="font-mono text-xs text-storm-gold font-bold">{weapon.mintSerialNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-card-border">
                <span className="font-ui text-secondary-text uppercase tracking-wide text-xs">Forged</span>
                <span className="font-ui text-xs text-secondary-text">
                  {new Date(weapon.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              {weapon.mintedAt && (
                <div className="flex justify-between items-center py-2 border-b border-card-border">
                  <span className="font-ui text-secondary-text uppercase tracking-wide text-xs">Minted</span>
                  <span className="font-ui text-xs text-storm-gold">
                    {new Date(weapon.mintedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {/* Print minted badge */}
            {weapon.printMinted && (
              <div className="flex items-center gap-2 bg-deep-navy border border-storm-gold/30 rounded-lg px-4 py-3">
                <span className="text-storm-gold text-lg">🏅</span>
                <div>
                  <p className="font-ui font-bold text-storm-gold text-sm uppercase tracking-wide">Print Minted</p>
                  <p className="font-body text-xs text-secondary-text">This weapon's physical form has been forged into reality.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Combat history */}
        <div className="bg-card-surface border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border">
            <h2 className="font-ui font-bold text-sm uppercase tracking-widest text-secondary-text">
              Combat History
            </h2>
          </div>
          <div className="divide-y divide-card-border">
            {weapon.recentDuels.length === 0 ? (
              <p className="px-5 py-4 text-sm text-secondary-text font-body">No recorded duels yet.</p>
            ) : (
              weapon.recentDuels.map((d) => {
                const won = d.winnerId !== null && d.winnerId !== "";
                const isWeaponWin = won && weapon.recentDuels.some(
                  (rd) => rd.id === d.id && rd.winnerId === weapon.owner.id
                );
                return (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="font-ui font-bold text-xs uppercase tracking-wide w-8"
                        style={{ color: d.winnerId === weapon.owner.id ? "#00FF9D" : "#6B7280" }}
                      >
                        {d.winnerId === null ? "—" : d.winnerId === weapon.owner.id ? "WIN" : "LOSS"}
                      </span>
                      <span className="font-body text-sm text-primary-text">
                        {d.challenger} <span className="text-secondary-text">vs</span> {d.defender}
                      </span>
                    </div>
                    {d.completedAt && (
                      <span className="font-ui text-xs text-secondary-text">
                        {new Date(d.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center font-ui text-xs text-secondary-text pb-4">
          battleforge.gg — Forged, staked, and earned in the arena.
        </p>
      </div>

      {/* Bottom gradient bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-void-purple to-arc-cyan" />
    </div>
  );
}
