import { useState } from "react";
import type { Move } from "../hooks/useFightControls";

interface ControlsLegendProps {
  visible: boolean;
  mode: "keyboard" | "gamepad";
}

interface MoveRow {
  move: Move;
  icon: string;
  label: string;
  key: string;
  gamepadLabel: string;
  gamepadColor: string;
}

const MOVE_ROWS: MoveRow[] = [
  { move: "punch", icon: "⚡", label: "PUNCH", key: "A", gamepadLabel: "A", gamepadColor: "#22c55e" },
  { move: "kick", icon: "🦵", label: "KICK", key: "S", gamepadLabel: "B", gamepadColor: "#ef4444" },
  { move: "weapon-strike", icon: "⚔", label: "STRIKE", key: "D", gamepadLabel: "Y", gamepadColor: "#eab308" },
  { move: "jump", icon: "↑", label: "JUMP", key: "W", gamepadLabel: "LB", gamepadColor: "#6b7280" },
  { move: "slide", icon: "↓", label: "SLIDE", key: "X", gamepadLabel: "RB", gamepadColor: "#6b7280" },
  { move: "block", icon: "🛡", label: "BLOCK", key: "SPC", gamepadLabel: "X", gamepadColor: "#3b82f6" },
];

export default function ControlsLegend({ visible, mode: externalMode }: ControlsLegendProps) {
  const [localMode, setLocalMode] = useState<"keyboard" | "gamepad" | null>(null);
  const mode = localMode ?? externalMode;

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "80px",
        left: "12px",
        zIndex: 50,
        background: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "12px",
        padding: "10px 12px",
        minWidth: "160px",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Mode toggle tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={() => setLocalMode("keyboard")}
          style={{
            flex: 1,
            padding: "3px 6px",
            borderRadius: "6px",
            fontSize: "10px",
            fontFamily: "inherit",
            cursor: "pointer",
            border: mode === "keyboard" ? "1px solid rgba(0,191,255,0.6)" : "1px solid rgba(255,255,255,0.1)",
            background: mode === "keyboard" ? "rgba(0,191,255,0.15)" : "transparent",
            color: mode === "keyboard" ? "#00BFFF" : "rgba(255,255,255,0.4)",
            transition: "all 0.15s",
          }}
        >
          ⌨ KB
        </button>
        <button
          onClick={() => setLocalMode("gamepad")}
          style={{
            flex: 1,
            padding: "3px 6px",
            borderRadius: "6px",
            fontSize: "10px",
            fontFamily: "inherit",
            cursor: "pointer",
            border: mode === "gamepad" ? "1px solid rgba(0,191,255,0.6)" : "1px solid rgba(255,255,255,0.1)",
            background: mode === "gamepad" ? "rgba(0,191,255,0.15)" : "transparent",
            color: mode === "gamepad" ? "#00BFFF" : "rgba(255,255,255,0.4)",
            transition: "all 0.15s",
          }}
        >
          🎮 PAD
        </button>
      </div>

      {/* Move rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {MOVE_ROWS.map((row) => (
          <div
            key={row.move}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            {mode === "keyboard" ? (
              <KeyBadge label={row.key} />
            ) : (
              <GamepadBadge label={row.gamepadLabel} color={row.gamepadColor} />
            )}
            <span style={{ fontSize: "13px", lineHeight: 1 }}>{row.icon}</span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "monospace",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        minWidth: "28px",
        height: "20px",
        borderRadius: "5px",
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        fontWeight: 700,
        color: "rgba(255,255,255,0.85)",
        fontFamily: "monospace",
        flexShrink: 0,
        padding: "0 4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {label}
    </div>
  );
}

function GamepadBadge({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        minWidth: "24px",
        height: "24px",
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "9px",
        fontWeight: 700,
        color: "white",
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}80`,
        fontFamily: "monospace",
      }}
    >
      {label}
    </div>
  );
}
