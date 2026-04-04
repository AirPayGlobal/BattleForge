import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Duel, RANK_COLORS, RANK_LABELS, CLASS_LABELS, CLASS_ICONS } from "../lib/types";
import WeaponCard from "../components/WeaponCard";

export default function DuelLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const { player, refreshPlayer } = useAuth();
  const navigate = useNavigate();
  const [duel, setDuel] = useState<Duel | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<{
    winnerId: string;
    rounds: { round: number; winner: string }[];
    weaponTransferred: boolean;
  } | null>(null);

  useEffect(() => {
    // We need to fetch the duel details. For now use pending or search duels.
    // In a real app this would be a dedicated GET /api/duels/:id endpoint
    // For now, let's just set loading false — the duel data came from navigation
    setLoading(false);
  }, [id]);

  const handleResolve = async () => {
    if (!id) return;
    setResolving(true);
    try {
      const { data } = await api.post(`/duels/${id}/result`);
      setResult(data);
      await refreshPlayer();

      if (data.winnerId === player?.id) {
        toast.success("Victory! You claimed their weapon!");
      } else {
        toast.error("Defeat. Your weapon has been claimed.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to resolve duel");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl text-primary-text">DUEL LOBBY</h1>
        <p className="text-secondary-text font-ui text-sm mt-1">
          Duel ID: {id?.slice(0, 8)}...
        </p>
      </div>

      {/* Result Display */}
      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* Victory/Defeat Banner */}
          <div
            className={`card text-center py-8 border ${
              result.winnerId === player?.id
                ? "border-victory-green"
                : "border-danger-red"
            }`}
          >
            <h2
              className={`font-display text-5xl ${
                result.winnerId === player?.id
                  ? "text-victory-green"
                  : "text-danger-red"
              }`}
            >
              {result.winnerId === player?.id ? "VICTORY" : "DEFEAT"}
            </h2>
            <p className="text-secondary-text font-ui mt-2">
              {result.weaponTransferred
                ? result.winnerId === player?.id
                  ? "You claimed your opponent's weapon!"
                  : "Your weapon was claimed by the victor."
                : "Forge Shield protected the weapon!"}
            </p>
          </div>

          {/* Round Results */}
          <div className="card">
            <h3 className="font-display text-lg text-primary-text mb-3">
              ROUND RESULTS
            </h3>
            <div className="space-y-2">
              {result.rounds.map((round) => (
                <div
                  key={round.round}
                  className="flex items-center justify-between bg-deep-navy/50 rounded-lg px-4 py-3"
                >
                  <span className="font-ui text-sm text-secondary-text">
                    Round {round.round}
                  </span>
                  <span
                    className={`font-ui font-bold text-sm uppercase ${
                      (round.winner === "challenger" &&
                        result.winnerId === player?.id) ||
                      (round.winner === "defender" &&
                        result.winnerId === player?.id)
                        ? "text-victory-green"
                        : "text-danger-red"
                    }`}
                  >
                    {round.winner === "challenger" ? "Challenger" : "Defender"}{" "}
                    Wins
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("/arena")}
            className="btn-primary w-full"
          >
            Return to Arena
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* VS Display */}
          <div className="card text-center py-8">
            <div className="flex items-center justify-center gap-8">
              <div>
                <div className="w-16 h-16 rounded-full bg-arc-cyan/20 border-2 border-arc-cyan flex items-center justify-center mb-2 mx-auto">
                  <span className="font-display text-xl text-arc-cyan">
                    &#x2694;
                  </span>
                </div>
                <p className="font-display text-lg text-primary-text">
                  {player?.username}
                </p>
                <p className="text-xs text-secondary-text font-ui">
                  Challenger
                </p>
              </div>

              <span className="font-display text-3xl text-storm-gold">VS</span>

              <div>
                <div className="w-16 h-16 rounded-full bg-danger-red/20 border-2 border-danger-red flex items-center justify-center mb-2 mx-auto">
                  <span className="font-display text-xl text-danger-red">
                    &#x2694;
                  </span>
                </div>
                <p className="font-display text-lg text-primary-text">
                  Opponent
                </p>
                <p className="text-xs text-secondary-text font-ui">Defender</p>
              </div>
            </div>
          </div>

          {/* Simulate Duel Button */}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className={`w-full py-5 rounded-xl font-display text-2xl uppercase tracking-wider transition-all ${
              resolving
                ? "bg-danger-red/30 text-danger-red forge-glow"
                : "bg-gradient-to-r from-danger-red to-storm-gold text-white hover:brightness-110 active:scale-[0.98]"
            }`}
          >
            {resolving ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-danger-red border-t-transparent rounded-full animate-spin" />
                FIGHTING...
              </span>
            ) : (
              "FIGHT!"
            )}
          </button>

          <p className="text-center text-xs text-secondary-text font-ui">
            Result is simulated (random best-of-3). Real-time combat coming in
            Phase 3.
          </p>
        </div>
      )}
    </div>
  );
}
