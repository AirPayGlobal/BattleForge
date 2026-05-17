import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Character, CharacterCosmetic, PlayerCosmetic } from "../lib/types";
import FighterSprite from "../components/FighterSprite";

const COSMETIC_TYPE_LABELS: Record<string, string> = {
  SKIN: "Skins",
  ACCESSORY: "Accessories",
  MOD: "Mods",
};

export default function CharacterPage() {
  const { player, refreshPlayer } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [ownedCosmetics, setOwnedCosmetics] = useState<PlayerCosmetic[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingCharacter, setSettingCharacter] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/characters"),
      api.get("/players/cosmetics"),
    ])
      .then(([charsRes, cosmeticsRes]) => {
        setCharacters(charsRes.data);
        setOwnedCosmetics(cosmeticsRes.data);
      })
      .catch(() => toast.error("Failed to load character data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSetCharacter = async (characterId: string) => {
    if (settingCharacter) return;
    setSettingCharacter(characterId);
    try {
      await api.post("/players/character", { characterId });
      await refreshPlayer();
      toast.success("Character updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update character");
    } finally {
      setSettingCharacter(null);
    }
  };

  const handleEquipToggle = async (cosmetic: PlayerCosmetic) => {
    if (equipping) return;
    setEquipping(cosmetic.cosmeticId);
    const isEquipped = cosmetic.equippedSlot !== null && cosmetic.equippedSlot !== undefined;
    try {
      const { data } = await api.post(`/players/cosmetics/${cosmetic.cosmeticId}/equip`, {
        equip: !isEquipped,
      });
      setOwnedCosmetics((prev: PlayerCosmetic[]) =>
        prev.map((c: PlayerCosmetic) => (c.cosmeticId === cosmetic.cosmeticId ? { ...c, equippedSlot: data.equippedSlot } : c))
      );
      toast.success(isEquipped ? "Cosmetic unequipped" : "Cosmetic equipped!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update cosmetic");
    } finally {
      setEquipping(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-arc-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentCharacter = characters.find((c) => c.id === player?.character?.id);

  const cosmeticsByType = {
    SKIN: ownedCosmetics.filter((c) => c.cosmetic.type === "SKIN"),
    ACCESSORY: ownedCosmetics.filter((c) => c.cosmetic.type === "ACCESSORY"),
    MOD: ownedCosmetics.filter((c) => c.cosmetic.type === "MOD"),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary-text">MY CHARACTER</h1>
          <p className="text-secondary-text font-ui text-sm">
            Choose your identity in the forge.
          </p>
        </div>
        <Link to="/store/cosmetics" className="btn-secondary text-sm">
          Cosmetic Store
        </Link>
      </div>

      {/* Current Character */}
      {currentCharacter ? (
        <div className="card border-arc-cyan/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-arc-cyan/5 to-void-purple/5 pointer-events-none" />
          <div className="relative flex flex-col items-center text-center py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-ui text-xs uppercase tracking-wider text-arc-cyan">Active Character</span>
            </div>
            <div className="mb-2">
              <FighterSprite
                character={player?.character?.name ?? "Ironclad"}
                side="left"
                action="idle"
                size={250}
              />
            </div>
            <h2 className="font-display text-2xl text-primary-text">{currentCharacter.name.toUpperCase()}</h2>
            <p className="text-secondary-text font-ui text-sm mt-1 max-w-md">{currentCharacter.description}</p>
          </div>
        </div>
      ) : (
        <div className="card text-center py-6">
          <p className="text-secondary-text font-ui text-sm">No character selected. Choose one below.</p>
        </div>
      )}

      {/* Character Selection Grid */}
      <div>
        <h2 className="font-display text-xl text-primary-text mb-4">CHOOSE CHARACTER</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char, i) => {
            const isActive = char.id === player?.character?.id;
            return (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`card cursor-pointer transition-all ${
                  isActive
                    ? "border-arc-cyan bg-arc-cyan/5"
                    : "hover:border-secondary-text"
                }`}
                onClick={() => !isActive && handleSetCharacter(char.id)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <FighterSprite
                      character={char.name}
                      side="left"
                      action="idle"
                      size={100}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-display text-lg text-primary-text truncate">{char.name.toUpperCase()}</h3>
                    {char.isDefault && (
                      <span className="text-[10px] font-ui font-bold uppercase tracking-wider bg-storm-gold/20 text-storm-gold border border-storm-gold/30 rounded-full px-2 py-0.5 flex-shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary-text font-ui line-clamp-2">{char.description}</p>
                </div>
                <div className="mt-3">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-ui font-bold uppercase tracking-wider text-arc-cyan">
                      <span className="w-1.5 h-1.5 bg-arc-cyan rounded-full" />
                      Active
                    </span>
                  ) : (
                    <button
                      disabled={settingCharacter === char.id}
                      className="btn-secondary w-full text-sm py-1.5"
                    >
                      {settingCharacter === char.id ? "Selecting..." : "Select"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Owned Cosmetics */}
      <div>
        <h2 className="font-display text-xl text-primary-text mb-4">OWNED COSMETICS</h2>
        {ownedCosmetics.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-secondary-text font-ui text-sm mb-3">
              You don't own any cosmetics yet.
            </p>
            <Link to="/store/cosmetics" className="btn-primary text-sm">
              Visit the Cosmetic Store
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {(["SKIN", "ACCESSORY", "MOD"] as const).map((type) => {
              const items = cosmeticsByType[type];
              if (items.length === 0) return null;
              return (
                <div key={type}>
                  <h3 className="font-ui text-sm uppercase tracking-wider text-secondary-text mb-3">
                    {COSMETIC_TYPE_LABELS[type]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((pc) => {
                      const isEquipped = pc.equippedSlot !== null && pc.equippedSlot !== undefined;
                      return (
                        <div
                          key={pc.id}
                          className={`card flex items-center gap-3 ${isEquipped ? "border-storm-gold/40 bg-storm-gold/5" : ""}`}
                        >
                          <div className="w-10 h-10 bg-deep-navy rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{type === "SKIN" ? "&#x1F3A8;" : type === "ACCESSORY" ? "&#x1F48E;" : "&#x2728;"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-ui font-semibold text-sm text-primary-text truncate">{pc.cosmetic.name}</p>
                            {isEquipped && (
                              <p className="text-[10px] font-ui text-storm-gold uppercase tracking-wider">Equipped</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleEquipToggle(pc)}
                            disabled={equipping === pc.cosmeticId}
                            className={`text-xs font-ui font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                              isEquipped
                                ? "border-secondary-text/30 text-secondary-text hover:border-danger-red/50 hover:text-danger-red"
                                : "border-arc-cyan/30 text-arc-cyan hover:bg-arc-cyan/10"
                            }`}
                          >
                            {equipping === pc.cosmeticId ? "..." : isEquipped ? "Unequip" : "Equip"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
