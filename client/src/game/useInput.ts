import { useEffect, useRef } from "react";
import type { PlayerInput } from "./types";
import { NEUTRAL_INPUT } from "./types";

/**
 * Keyboard input → PlayerInput.
 *
 * Movement & block are HELD keys (read continuously).
 * Attacks & jump are EDGE-TRIGGERED — they fire once on press and
 * are consumed by the engine each tick.
 *
 * Returns a `getInput()` function that returns the current snapshot and
 * automatically clears the edge-triggered fields after read.
 */

const MAP: Record<string, keyof PlayerInput> = {
  KeyA: "left",     ArrowLeft:  "left",
  KeyD: "right",    ArrowRight: "right",
  KeyW: "jump",     ArrowUp:    "jump",
  KeyS: "block",    ArrowDown:  "block",
  // attacks
  KeyJ: "light",
  KeyK: "heavy",
  KeyL: "kick",
  Space: "ultimate",
  Enter: "ultimate",
};

const EDGE: Set<keyof PlayerInput> = new Set([
  "light", "heavy", "kick", "jump", "ultimate",
]);

export function useKeyboardInput(active: boolean) {
  const stateRef = useRef<PlayerInput>({ ...NEUTRAL_INPUT });
  // edges fired since last consume:
  const edgeRef = useRef<Partial<Record<keyof PlayerInput, boolean>>>({});

  useEffect(() => {
    if (!active) return;

    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const mapped = MAP[e.code];
      if (!mapped) return;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      stateRef.current[mapped] = true;
      if (EDGE.has(mapped)) edgeRef.current[mapped] = true;
    };
    const up = (e: KeyboardEvent) => {
      const mapped = MAP[e.code];
      if (!mapped) return;
      stateRef.current[mapped] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [active]);

  const consume = (): PlayerInput => {
    const s = stateRef.current;
    const e = edgeRef.current;
    const snap: PlayerInput = {
      left:     s.left,
      right:    s.right,
      block:    s.block,
      jump:     !!e.jump,
      light:    !!e.light,
      heavy:    !!e.heavy,
      kick:     !!e.kick,
      ultimate: !!e.ultimate,
    };
    edgeRef.current = {};
    return snap;
  };

  return { consume };
}
