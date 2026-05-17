import { useState, useCallback, useEffect } from "react";

export interface ScreenEffectsState {
  isShaking: boolean;
  isFlashing: boolean;
  flashColor: string;
  triggerShake: (intensity?: "light" | "heavy") => void;
  triggerFlash: (color: string) => void;
}

// Inject screen-shake keyframe once
let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@keyframes screen-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  15% { transform: translate(-6px, 3px) rotate(-1deg); }
  30% { transform: translate(6px, -3px) rotate(1deg); }
  45% { transform: translate(-4px, 4px) rotate(0deg); }
  60% { transform: translate(4px, -2px) rotate(-0.5deg); }
  75% { transform: translate(-2px, 2px) rotate(0.5deg); }
}
@keyframes screen-shake-heavy {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  10% { transform: translate(-10px, 5px) rotate(-1.5deg); }
  20% { transform: translate(10px, -5px) rotate(1.5deg); }
  30% { transform: translate(-8px, 6px) rotate(-1deg); }
  40% { transform: translate(8px, -4px) rotate(1deg); }
  50% { transform: translate(-5px, 4px) rotate(-0.5deg); }
  60% { transform: translate(5px, -3px) rotate(0.5deg); }
  70% { transform: translate(-3px, 3px) rotate(-0.3deg); }
  80% { transform: translate(3px, -2px) rotate(0.3deg); }
  90% { transform: translate(-1px, 1px) rotate(0deg); }
}
  `;
  document.head.appendChild(style);
}

export function useScreenEffects(): ScreenEffectsState {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState<"light" | "heavy">("light");
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState("#FF3D6B");

  useEffect(() => {
    injectKeyframes();
  }, []);

  const triggerShake = useCallback((intensity: "light" | "heavy" = "light") => {
    setShakeIntensity(intensity);
    setIsShaking(false);
    // Force re-trigger by briefly clearing
    requestAnimationFrame(() => {
      setIsShaking(true);
      const duration = intensity === "heavy" ? 500 : 300;
      setTimeout(() => setIsShaking(false), duration);
    });
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
  }, []);

  return { isShaking, isFlashing, flashColor, triggerShake, triggerFlash };
}
