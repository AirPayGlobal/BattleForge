import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import {
  Weapon,
  Duel,
  SearchPlayer,
  WeaponRank,
  RANK_ORDER,
  RANK_LABELS,
  RANK_COLORS,
} from "../lib/types";
import WeaponCard from "../components/WeaponCard";

export default function ArenaPage() {
  const { player } = useAuth();
  const navigate = useNavigate();
  const [myWeapons, setMyWeapons] = useState<Weapon[]>([]);
  const [selectedRank, setSelectedRank] = useState<WeaponRank | "">("");
  const [opponents, setOpponents] = useState<SearchPlayer[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [pendingDuels, setPendingDuels] = useState<Duel[]>([]);
  const [searching, setSearching] = useState(false);
  const [challenging, setChallenging] = useState(false);

  // Load my weapons and pending duels
  useEffect(() => {
    api.get("/weapons").then(({ data }) => setMyWeapons(data));
    api.get("/duels/pending").then(({ data }) => setPendingDuels(data));
  }, []);

  // Search opponents when rank changes
  useEffect(() => {
    if (!selectedRank) {
      setOpponents([]);
      return;
    }
    setSearching(true);
    api
      .get(`/players/search?rank=${selectedRank}`)
      .then(({ data }) => setOpponents(data))
      .catch(() => toast.error("Failed to search opponents"))
      .finally(() => setSearching(false));
  }, [selectedRank]);

  const myWeaponsForRank = myWeapons.filter(
    (w) => w.rank === selectedRank && !w.isStaked
  );

  const handleChallenge = async (
    defenderId: string,
    defenderWeaponId: string
  ) => {
    if (!selectedWeapon) {
      toast.error("Select one of your weapons first");
      return;
    }
    setChallenging(true);
    try {
      const { data } = await api.post("/duels/challenge", {
        defenderId,
        challengerWeaponId: selectedWeapon.id,
        defenderWeaponId,
      });
      toast.success("Challenge sent!");
      navigate(`/arena/duel/${data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Challenge failed");
    } finally {
      setChallenging(false);
    }
  };

  const handleAccept = async (duelId: string) => {
    try {
      await api.post(`/duels/${duelId}/accept`);
      toast.success("Challenge accepted!");
      navigate(`/arena/duel/${duelId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to accept");
    }
  };

  const handleDecline = async (duelId: string) => {
    try {
      await api.post(`/duels/${duelId}/decline`);
      toast("Challenge declined");
      setPendingDuels((prev) => prev.filter((d) => d.id !== duelId));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to decline");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary-text">THE ARENA</h1>
        <p className="text-secondary-text font-ui text-sm">
          Challenge opponents of matching rank. Stake your weapon. Winner takes
          all.
        </p>
      </div>

      {/* Pending Challenges */}
      {pendingDuels.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl text-danger-red">
            INCOMING CHALLENGES
          </h2>
          {pendingDuels.map((duel) => (
            <div
              key={duel.id}
              className="card border-danger-red/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <p className="font-ui font-bold text-primary-text">
                  {duel.challenger?.username} challenges you!
                </p>
                <p className="text-xs text-secondary-text font-ui">
                  Weapon:{" "}
                  <span className="text-primary-text">
                    {duel.challengerWeapon?.name}
                  </span>{" "}
                  vs{" "}
                  <span className="text-primary-text">
                    {duel.defenderWeapon?.name}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(duel.id)}
                  className="btn-primary text-sm py-2"
                >
                  Accept
                </button>
                {!duel.gauntletUsed && (
                  <button
                    onClick={() => handleDecline(duel.id)}
                    className="btn-danger text-sm py-2"
                  >
                    Decline
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rank Selection */}
      <div className="card">
        <label className="block font-ui text-xs uppercase tracking-wider text-secondary-text mb-3">
          Select Rank to Fight
        </label>
        <div className="flex flex-wrap gap-2">
          {RANK_ORDER.map((rank) => {
            const hasWeapon = myWeapons.some(
              (w) => w.rank === rank && !w.isStaked
            );
            return (
              <button
                key={rank}
                onClick={() => {
                  setSelectedRank(rank);
                  setSelectedWeapon(null);
                }}
                disabled={!hasWeapon}
                className={`px-4 py-2 rounded-lg border font-ui text-sm font-bold uppercase tracking-wider transition-all ${
                  selectedRank === rank
                    ? "border-arc-cyan bg-arc-cyan/10 text-arc-cyan"
                    : hasWeapon
                    ? "border-card-border text-primary-text hover:border-secondary-text"
                    : "border-card-border text-secondary-text/40 cursor-not-allowed"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: RANK_COLORS[rank] }}
                />
                {RANK_LABELS[rank]}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRank && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Weapons for this rank */}
          <div>
            <h2 className="font-display text-lg text-primary-text mb-3">
              YOUR WEAPONS
            </h2>
            {myWeaponsForRank.length === 0 ? (
              <div className="card text-center py-6">
                <p className="text-secondary-text font-ui text-sm">
                  No available weapons at this rank
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {myWeaponsForRank.map((w) => (
                  <WeaponCard
                    key={w.id}
                    weapon={w}
                    compact
                    selected={selectedWeapon?.id === w.id}
                    onClick={() => setSelectedWeapon(w)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Opponents */}
          <div>
            <h2 className="font-display text-lg text-primary-text mb-3">
              OPPONENTS
            </h2>
            {searching ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : opponents.length === 0 ? (
              <div className="card text-center py-6">
                <p className="text-secondary-text font-ui text-sm">
                  No opponents found at this rank
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {opponents.map((opp) => (
                  <div key={opp.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-display text-lg text-primary-text">
                          {opp.username}
                        </h3>
                        <p className="text-xs font-ui text-secondary-text">
                          <span className="text-victory-green">
                            {opp.wins}W
                          </span>{" "}
                          /{" "}
                          <span className="text-danger-red">
                            {opp.losses}L
                          </span>
                          {opp.winStreak > 0 && (
                            <span className="text-storm-gold ml-2">
                              &#x1F525; {opp.winStreak} streak
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {opp.weapons.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between bg-deep-navy/50 rounded-lg px-3 py-2"
                        >
                          <div>
                            <span className="font-ui text-sm font-semibold text-primary-text">
                              {w.name}
                            </span>
                            <span className="text-xs text-secondary-text ml-2">
                              {w.wins}W/{w.losses}L
                            </span>
                          </div>
                          <button
                            onClick={() => handleChallenge(opp.id, w.id)}
                            disabled={!selectedWeapon || challenging}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            {challenging ? "..." : "Challenge"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
