import { useState, useEffect, useRef, useCallback } from "react";

export type Move = "punch" | "kick" | "weapon-strike" | "jump" | "slide" | "block";

export interface FightControlsState {
  pendingMove: Move | null;
  highlightedMove: Move | null;
  isGamepadConnected: boolean;
  gamepadName: string;
  confirmMove: (move: Move) => void;
  clearMove: () => void;
}

// Keyboard key → Move mapping
const KEY_TO_MOVE: Record<string, Move> = {
  KeyA: "punch",
  KeyS: "kick",
  KeyD: "weapon-strike",
  KeyF: "weapon-strike",
  KeyW: "jump",
  ArrowUp: "jump",
  KeyX: "slide",
  ArrowDown: "slide",
  Space: "block",
  ArrowLeft: "block",
  ArrowRight: "block",
};

// Gamepad button index → Move mapping
const BUTTON_TO_MOVE: Record<number, Move> = {
  0: "punch",       // A / Cross
  1: "kick",        // B / Circle
  2: "block",       // X / Square
  3: "weapon-strike", // Y / Triangle
  4: "jump",        // LB / L1
  5: "slide",       // RB / R1
};

export function useFightControls(
  active: boolean,
  onMove: (move: Move) => void
): FightControlsState {
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [highlightedMove, setHighlightedMove] = useState<Move | null>(null);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevButtonsRef = useRef<boolean[][]>([]); // [gamepadIndex][buttonIndex]
  const onMoveRef = useRef(onMove);
  const activeRef = useRef(active);

  // Keep refs in sync so gamepad loop closure doesn't go stale
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const confirmMove = useCallback((move: Move) => {
    setPendingMove(move);
  }, []);

  const clearMove = useCallback(() => {
    setPendingMove(null);
    setHighlightedMove(null);
  }, []);

  // ── Keyboard handling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const move = KEY_TO_MOVE[e.code];
      if (!move) return;

      // Prevent default for arrow keys / space to avoid scrolling
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }

      setHighlightedMove(move);

      // Debounce: confirm after 100ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPendingMove(move);
        onMoveRef.current(move);
      }, 100);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const move = KEY_TO_MOVE[e.code];
      if (!move) return;
      setHighlightedMove((prev: Move | null) => (prev === move ? null : prev));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [active]);

  // ── Gamepad connect/disconnect events ───────────────────────────────────
  useEffect(() => {
    const handleConnect = (e: GamepadEvent) => {
      setIsGamepadConnected(true);
      setGamepadName(e.gamepad.id);
    };

    const handleDisconnect = () => {
      const pads = navigator.getGamepads();
      const anyConnected = Array.from(pads).some((p) => p !== null);
      setIsGamepadConnected(anyConnected);
      if (!anyConnected) setGamepadName("");
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    // Check for already-connected gamepads on mount
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of Array.from(pads)) {
      if (pad) {
        setIsGamepadConnected(true);
        setGamepadName(pad.id);
        break;
      }
    }

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, []);

  // ── Gamepad polling via requestAnimationFrame ────────────────────────────
  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const poll = () => {
      if (!activeRef.current) {
        rafRef.current = null;
        return;
      }

      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let gi = 0; gi < pads.length; gi++) {
        const pad = pads[gi];
        if (!pad) continue;

        if (!prevButtonsRef.current[gi]) {
          prevButtonsRef.current[gi] = new Array(pad.buttons.length).fill(false);
        }

        for (let bi = 0; bi < pad.buttons.length; bi++) {
          const pressed = pad.buttons[bi].value > 0.5;
          const wasPressed = prevButtonsRef.current[gi][bi] ?? false;

          // Detect new press (edge trigger)
          if (pressed && !wasPressed) {
            const move = BUTTON_TO_MOVE[bi];
            if (move) {
              setHighlightedMove(move);
              setPendingMove(move);
              onMoveRef.current(move);
            }
          }

          // Detect release
          if (!pressed && wasPressed) {
            const move = BUTTON_TO_MOVE[bi];
            if (move) {
              setHighlightedMove((prev: Move | null) => (prev === move ? null : prev));
            }
          }

          prevButtonsRef.current[gi][bi] = pressed;
        }
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active]);

  return {
    pendingMove,
    highlightedMove,
    isGamepadConnected,
    gamepadName,
    confirmMove,
    clearMove,
  };
}
