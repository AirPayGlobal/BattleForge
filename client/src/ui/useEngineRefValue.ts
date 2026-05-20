import { useEffect, useRef, useState } from "react";
import type { CombatEngine } from "../game/engine";

/**
 * Subscribes to a selector over the engine state via RAF.
 * Re-renders only when the selected value changes.
 */
export function useEngineValue<T>(
  engineRef: React.MutableRefObject<CombatEngine | null>,
  selector: (eng: CombatEngine) => T,
  initial: T,
): T {
  const [val, setVal] = useState<T>(initial);
  const valRef = useRef(initial);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const eng = engineRef.current;
      if (eng) {
        const next = selector(eng);
        if (!Object.is(valRef.current, next)) {
          valRef.current = next;
          setVal(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return val;
}
