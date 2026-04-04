import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "../lib/api";
import { RANK_LABELS, RANK_COLORS, WeaponRank } from "../lib/types";

interface Tournament {
  id: string;
  name: string;
  entryWeaponRank: WeaponRank;
  startTime: string;
  status: string;
  maxPlayers: number;
  bracket: any;
  _count?: { entries: number };
}

interface TournamentDetail extends Tournament {
  entries: {
    id: string;
    playerId: string;
    weaponId: string;
    player: { id: string; username: string; wins: number; losses: number };
    weapon: { id: string; name: string; rank: WeaponRank };
  }[];
}

function BracketView({ bracket }: { bracket: any }) {
  if (!bracket?.rounds) return null;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max py-4">
        {bracket.rounds.map((round: any) => (
          <div key={round.round} className="flex flex-col gap-4 justify-around">
            <p className="font-ui text-xs uppercase tracking-wider text-secondary-text text-center mb-2">
              {round.round === bracket.rounds.length ? "Final" : `Round ${round.round}`}
            </p>
            {round.matches.map((match: any) => (
              <div
                key={match.matchId}
                className={`card w-44 text-sm ${
                  match.status === "PENDING" ? "opacity-60" : ""
                }`}
              >
                <div className={`py-1.5 px-2 rounded-lg mb-1 font-ui font-semibold ${
                  match.winner?.id === match.player1?.id ? "text-victory-green" : "text-primary-text"
                }`}>
                  {match.player1?.username ?? <span className="text-secondary-text">TBD</span>}
                </div>
                <div className="text-center text-xs text-secondary-text font-ui">VS</div>
                <div className={`py-1.5 px-2 rounded-lg mt-1 font-ui font-semibold ${
                  match.winner?.id === match.player2?.id ? "text-victory-green" : "text-primary-text"
                }`}>
                  {match.player2?.username ?? <span className="text-secondary-text">TBD</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api
      .get("/tournaments")
      .then(({ data }) => setTournaments(data))
      .catch(() => toast.error("Failed to load tournaments"))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/tournaments/${id}`);
      setSelected(data);
    } catch {
      toast.error("Failed to load tournament");
    } finally {
      setDetailLoading(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    UPCOMING: "#3A5080",
    OPEN: "#00FF9D",
    IN_PROGRESS: "#FFD600",
    COMPLETED: "#7B2FFF",
    CANCELLED: "#FF3D6B",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary-text">TOURNAMENTS</h1>
        <p className="text-secondary-text font-ui text-sm">
          Single-elimination bracket tournaments. Stake your weapon. Win glory.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3 opacity-30">🏆</div>
          <h3 className="font-display text-xl text-primary-text mb-2">NO ACTIVE TOURNAMENTS</h3>
          <p className="text-secondary-text font-ui text-sm">Check back soon for upcoming events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card cursor-pointer hover:border-arc-cyan/50 transition-all"
              onClick={() => openDetail(t.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-lg text-primary-text leading-tight">{t.name}</h3>
                <span
                  className="text-[10px] font-ui font-bold uppercase tracking-wider rounded-full px-2 py-0.5 flex-shrink-0 ml-2"
                  style={{
                    color: STATUS_COLORS[t.status],
                    backgroundColor: `${STATUS_COLORS[t.status]}20`,
                    border: `1px solid ${STATUS_COLORS[t.status]}40`,
                  }}
                >
                  {t.status}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-text font-ui">Entry Rank:</span>
                  <span
                    className="text-xs font-ui font-bold"
                    style={{ color: RANK_COLORS[t.entryWeaponRank] }}
                  >
                    {RANK_LABELS[t.entryWeaponRank]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-text font-ui">Players:</span>
                  <span className="text-xs text-primary-text font-ui">
                    {t._count?.entries ?? 0} / {t.maxPlayers}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-text font-ui">Starts:</span>
                  <span className="text-xs text-primary-text font-ui">
                    {new Date(t.startTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tournament detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative card w-full max-w-3xl max-h-[80vh] overflow-y-auto z-10"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl text-primary-text">{selected.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-ui text-secondary-text">
                    {selected.entries.length} / {selected.maxPlayers} players
                  </span>
                  <span className="text-xs font-ui font-bold" style={{ color: RANK_COLORS[selected.entryWeaponRank] }}>
                    {RANK_LABELS[selected.entryWeaponRank]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-secondary-text hover:text-primary-text">
                ✕
              </button>
            </div>

            {selected.bracket ? (
              <div>
                <h3 className="font-display text-lg text-primary-text mb-3">BRACKET</h3>
                <BracketView bracket={selected.bracket} />
              </div>
            ) : (
              <div>
                <h3 className="font-display text-lg text-primary-text mb-3">PARTICIPANTS ({selected.entries.length})</h3>
                {selected.entries.length === 0 ? (
                  <p className="text-secondary-text font-ui text-sm">No entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between bg-deep-navy/50 rounded-lg px-4 py-3">
                        <div>
                          <span className="font-ui font-bold text-primary-text">{entry.player.username}</span>
                          <span className="text-xs text-secondary-text ml-2 font-ui">
                            {entry.player.wins}W / {entry.player.losses}L
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-primary-text font-ui">{entry.weapon.name}</span>
                          <span
                            className="text-xs ml-2 font-ui"
                            style={{ color: RANK_COLORS[entry.weapon.rank] }}
                          >
                            {RANK_LABELS[entry.weapon.rank]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
