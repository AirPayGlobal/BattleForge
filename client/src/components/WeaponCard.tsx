import { Weapon, RANK_LABELS, RANK_COLORS, CLASS_LABELS, CLASS_ICONS } from "../lib/types";

interface WeaponCardProps {
  weapon: Weapon;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export default function WeaponCard({
  weapon,
  selected,
  onClick,
  compact,
}: WeaponCardProps) {
  const rankColor = RANK_COLORS[weapon.rank];
  const isGauntlet = weapon.class === "GAUNTLET";

  return (
    <div
      onClick={onClick}
      className={`card relative overflow-hidden transition-all duration-200 ${
        onClick ? "cursor-pointer hover:scale-[1.02]" : ""
      } ${selected ? "ring-2 ring-arc-cyan" : ""} ${
        isGauntlet ? "border-storm-gold" : ""
      }`}
      style={
        isGauntlet
          ? { borderColor: "#FFD600", boxShadow: "0 0 20px rgba(255, 214, 0, 0.15)" }
          : {}
      }
    >
      {/* Rank color top border */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: rankColor }}
      />

      {/* Print Eligible Badge */}
      {weapon.isPrintEligible && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-ui font-bold uppercase tracking-wider bg-void-purple/20 text-void-purple border border-void-purple/30 rounded-full px-2 py-0.5">
            3D Print
          </span>
        </div>
      )}

      {/* Staked Badge */}
      {weapon.isStaked && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-ui font-bold uppercase tracking-wider bg-danger-red/20 text-danger-red border border-danger-red/30 rounded-full px-2 py-0.5">
            Staked
          </span>
        </div>
      )}

      <div className={compact ? "pt-2" : "pt-3"}>
        {/* Rank Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-ui font-bold uppercase tracking-wider rounded px-2 py-0.5"
            style={{
              backgroundColor: `${rankColor}20`,
              color: rankColor,
              border: `1px solid ${rankColor}40`,
            }}
          >
            {RANK_LABELS[weapon.rank]}
          </span>
          {weapon.forgeShield && (
            <span className="text-[10px]" title="Forge Shield Active">
              &#x1F6E1;&#xFE0F;
            </span>
          )}
        </div>

        {/* Weapon Name */}
        <h3
          className={`font-display ${
            compact ? "text-lg" : "text-xl"
          } text-primary-text leading-tight`}
        >
          {weapon.name}
        </h3>

        {/* Class */}
        <p className="text-xs text-secondary-text font-ui mt-1">
          {CLASS_ICONS[weapon.class]} {CLASS_LABELS[weapon.class]}
        </p>

        {!compact && (
          <>
            {/* W/L Record */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs font-ui">
                <span className="text-victory-green font-bold">
                  {weapon.wins}W
                </span>
                <span className="text-secondary-text mx-1">/</span>
                <span className="text-danger-red font-bold">
                  {weapon.losses}L
                </span>
              </span>
              <span className="text-xs text-secondary-text font-ui">
                {weapon.xpCost.toLocaleString()} XP
              </span>
            </div>

            {/* Serial */}
            <p className="text-[10px] text-secondary-text/60 font-mono mt-2">
              {weapon.serialNumber}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
