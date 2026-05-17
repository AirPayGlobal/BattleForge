// ═══════════════════════════════════
// BattleForge — Animated Fighter Sprites
// ═══════════════════════════════════

import { useEffect } from "react";

type SpriteAction = "idle" | "attack" | "hit" | "block" | "victory" | "defeat"
  | "punch" | "kick" | "weapon-strike" | "jump" | "slide";

interface FighterSpriteProps {
  character: string;        // character name, case-insensitive
  side: "left" | "right";  // left = player (faces right), right = NPC (faces left, mirrored)
  action: SpriteAction;
  size?: number;            // height in px, default 200
}

const FIGHTER_SPRITE_STYLE_ID = "fighter-sprite-keyframes";

const KEYFRAME_CSS = `
@keyframes idle-sway {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes attack-lunge {
  0% { transform: translateX(0); }
  30% { transform: translateX(40px); }
  60% { transform: translateX(20px); }
  100% { transform: translateX(0); }
}
@keyframes hit-recoil {
  0% { transform: translateX(0); }
  20% { transform: translateX(-25px) rotate(-5deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
@keyframes block-stance {
  0%, 100% { transform: translateX(0) scaleX(0.9); }
  50% { transform: translateX(-5px) scaleX(0.88); }
}
@keyframes victory-jump {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-20px); }
  75% { transform: translateY(-10px); }
}
@keyframes defeat-slump {
  0% { transform: rotate(0deg) translateY(0); }
  100% { transform: rotate(-30deg) translateY(20px); }
}
@keyframes punch-anim {
  0% { transform: translateX(0) rotate(0deg); }
  20% { transform: translateX(30px) rotate(-5deg); }
  50% { transform: translateX(15px) rotate(-2deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
@keyframes kick-anim {
  0% { transform: translateX(0) skewX(0deg); }
  25% { transform: translateX(20px) skewX(-8deg); }
  60% { transform: translateX(10px) skewX(-4deg); }
  100% { transform: translateX(0) skewX(0deg); }
}
@keyframes jump-anim {
  0%   { transform: translateY(0); }
  40%  { transform: translateY(-35px); }
  70%  { transform: translateY(-20px); }
  100% { transform: translateY(0); }
}
@keyframes slide-anim {
  0%   { transform: translateY(0) scaleY(1); }
  30%  { transform: translateY(15px) scaleY(0.7); }
  70%  { transform: translateY(10px) scaleY(0.75); }
  100% { transform: translateY(0) scaleY(1); }
}
@keyframes weapon-strike-anim {
  0%   { transform: translateX(0) rotate(0deg); }
  15%  { transform: translateX(0) rotate(-15deg); }
  40%  { transform: translateX(45px) rotate(10deg); }
  70%  { transform: translateX(20px) rotate(5deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
`;

const actionAnimation: Record<string, string> = {
  idle: "idle-sway 2.5s ease-in-out infinite",
  attack: "attack-lunge 0.5s ease-out forwards",
  hit: "hit-recoil 0.4s ease-out forwards",
  block: "block-stance 0.3s ease-in forwards",
  victory: "victory-jump 0.8s ease-in-out infinite",
  defeat: "defeat-slump 0.5s ease-out forwards",
  punch: "punch-anim 0.4s ease-out forwards",
  kick: "kick-anim 0.4s ease-out forwards",
  jump: "jump-anim 0.5s ease-out forwards",
  slide: "slide-anim 0.4s ease-out forwards",
  "weapon-strike": "weapon-strike-anim 0.6s ease-out forwards",
};

// ─── IRONCLAD ──────────────────────────────────────────────────────────────
function IroncladSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  const s = scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Legs */}
      <rect x="40" y="175" width="17" height="45" rx="4" fill="#4a90d9" />
      <rect x="63" y="175" width="17" height="45" rx="4" fill="#4a90d9" />
      {/* Knee guards */}
      <rect x="38" y="185" width="21" height="8" rx="3" fill="#c0c0c0" />
      <rect x="61" y="185" width="21" height="8" rx="3" fill="#c0c0c0" />
      {/* Boot accents */}
      <rect x="39" y="210" width="19" height="10" rx="3" fill="#c0c0c0" />
      <rect x="62" y="210" width="19" height="10" rx="3" fill="#c0c0c0" />
      {/* Belt */}
      <rect x="33" y="168" width="54" height="10" rx="3" fill="#ffd700" />
      {/* Torso — broad chest */}
      <rect x="33" y="105" width="54" height="66" rx="6" fill="#4a90d9" />
      {/* Chest plate */}
      <rect x="38" y="110" width="44" height="56" rx="4" fill="#c0c0c0" />
      {/* Chest plate lines */}
      <line x1="60" y1="114" x2="60" y2="162" stroke="#4a90d9" strokeWidth="2" />
      <line x1="42" y1="130" x2="78" y2="130" stroke="#4a90d9" strokeWidth="2" />
      <line x1="42" y1="148" x2="78" y2="148" stroke="#4a90d9" strokeWidth="2" />
      {/* Gold trim on chest */}
      <rect x="38" y="110" width="44" height="4" rx="2" fill="#ffd700" />
      {/* Left pauldron (shield arm) */}
      <rect x="12" y="100" width="24" height="16" rx="6" fill="#c0c0c0" />
      {/* Right pauldron (sword arm) */}
      <rect x="84" y="100" width="24" height="16" rx="6" fill="#c0c0c0" />
      {/* Left arm holding shield */}
      <rect x="14" y="114" width="16" height="50" rx="5" fill="#4a90d9" />
      {/* Shield */}
      <rect x="2" y="112" width="24" height="36" rx="5" fill="#4a90d9" />
      <rect x="4" y="114" width="20" height="32" rx="4" fill="#2563eb" stroke="#c0c0c0" strokeWidth="2" />
      {/* Cross on shield */}
      <rect x="13" y="116" width="3" height="28" fill="white" />
      <rect x="5" y="127" width="22" height="3" fill="white" />
      {/* Right arm holding sword */}
      <rect x="90" y="114" width="16" height="40" rx="5" fill="#4a90d9" />
      {/* Sword blade — angled upward */}
      <rect x="100" y="72" width="6" height="60" rx="2" fill="#c0c0c0" transform="rotate(10 103 102)" />
      <rect x="101" y="74" width="4" height="55" rx="1" fill="#e8e8e8" transform="rotate(10 103 102)" />
      {/* Sword guard */}
      <rect x="95" y="112" width="20" height="5" rx="2" fill="#ffd700" />
      {/* Sword handle */}
      <rect x="101" y="117" width="6" height="15" rx="2" fill="#8B4513" />
      {/* Neck */}
      <rect x="52" y="90" width="16" height="18" rx="4" fill="#4a90d9" />
      {/* Head — rounded rect */}
      <rect x="38" y="58" width="44" height="36" rx="8" fill="#c0c0c0" />
      {/* Visor — T-shape */}
      <rect x="44" y="68" width="32" height="6" rx="2" fill="#1a1a2e" />
      <rect x="56" y="66" width="8" height="20" rx="2" fill="#1a1a2e" />
      {/* Helmet ridge */}
      <rect x="50" y="56" width="20" height="6" rx="3" fill="#c0c0c0" />
      <rect x="56" y="50" width="8" height="10" rx="2" fill="#ffd700" />
      {/* Gold trim on helmet */}
      <rect x="38" y="58" width="44" height="4" rx="2" fill="#ffd700" />
    </svg>
  );
}

// ─── SHADOWBLADE ───────────────────────────────────────────────────────────
function ShadowbladeSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Purple glow particles */}
      <circle cx="20" cy="120" r="3" fill="#e879f9" opacity="0.6" />
      <circle cx="100" cy="140" r="2" fill="#e879f9" opacity="0.5" />
      <circle cx="15" cy="155" r="2.5" fill="#6b21a8" opacity="0.7" />
      <circle cx="105" cy="110" r="2" fill="#e879f9" opacity="0.4" />
      <circle cx="25" cy="185" r="2" fill="#e879f9" opacity="0.5" />
      <circle cx="95" cy="170" r="3" fill="#6b21a8" opacity="0.6" />
      <circle cx="30" cy="80" r="2" fill="#e879f9" opacity="0.4" />
      {/* Cloak body — flowing trapezoid */}
      <path d="M28 120 L92 120 L100 220 L20 220 Z" fill="#1a0a2e" />
      {/* Cloak highlights */}
      <path d="M28 120 L60 120 L65 220 L20 220 Z" fill="#2d0a4e" opacity="0.6" />
      {/* Inner garment */}
      <rect x="42" y="118" width="36" height="60" rx="4" fill="#6b21a8" />
      {/* Body under cloak */}
      <rect x="38" y="108" width="44" height="16" rx="4" fill="#6b21a8" />
      {/* Cloak top wrapping shoulders */}
      <path d="M20 100 Q60 95 100 100 L100 125 Q60 118 20 125 Z" fill="#1a0a2e" />
      {/* Left arm + dagger pointing forward */}
      <rect x="16" y="110" width="14" height="38" rx="5" fill="#6b21a8" />
      {/* Left dagger */}
      <path d="M8 128 L22 128 L18 155 L12 155 Z" fill="#c0c0c0" />
      <path d="M9 130 L21 130 L17 153 L13 153 Z" fill="#e0e0e0" />
      {/* Dagger guard */}
      <rect x="7" y="126" width="18" height="4" rx="2" fill="#e879f9" />
      {/* Right arm + dagger pointing up */}
      <rect x="90" y="108" width="14" height="38" rx="5" fill="#6b21a8" />
      {/* Right dagger — vertical */}
      <path d="M91 80 L100 80 L97 116 L93 116 Z" fill="#c0c0c0" />
      <path d="M92 82 L99 82 L96 114 L94 114 Z" fill="#e0e0e0" />
      {/* Right dagger guard */}
      <rect x="88" y="113" width="18" height="4" rx="2" fill="#e879f9" />
      {/* Neck */}
      <rect x="52" y="94" width="16" height="16" rx="4" fill="#6b21a8" />
      {/* Head circle */}
      <circle cx="60" cy="80" r="16" fill="#6b21a8" />
      {/* Face */}
      <circle cx="60" cy="80" r="14" fill="#4a1575" />
      {/* Eyes — glowing purple */}
      <ellipse cx="54" cy="78" rx="3" ry="2" fill="#e879f9" />
      <ellipse cx="66" cy="78" rx="3" ry="2" fill="#e879f9" />
      {/* Hood — large dark rounded triangle */}
      <path d="M30 82 Q60 30 90 82 Q80 75 60 72 Q40 75 30 82 Z" fill="#1a0a2e" />
      {/* Hood shadow */}
      <path d="M36 85 Q60 38 84 85 Q75 80 60 78 Q45 80 36 85 Z" fill="#0d0520" opacity="0.7" />
      {/* Feet peek from cloak */}
      <ellipse cx="36" cy="222" rx="10" ry="5" fill="#1a0a2e" />
      <ellipse cx="82" cy="222" rx="10" ry="5" fill="#1a0a2e" />
      {/* Accent gems */}
      <circle cx="60" cy="112" r="4" fill="#e879f9" opacity="0.8" />
    </svg>
  );
}

// ─── STONEFORGED ───────────────────────────────────────────────────────────
function StoneforgedSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Massive legs / pillars */}
      <rect x="20" y="170" width="30" height="55" rx="4" fill="#78716c" />
      <rect x="70" y="170" width="30" height="55" rx="4" fill="#78716c" />
      {/* Leg shadow sides */}
      <rect x="20" y="170" width="8" height="55" rx="4" fill="#44403c" />
      <rect x="92" y="170" width="8" height="55" rx="4" fill="#44403c" />
      {/* Lava crack on left leg */}
      <path d="M28 185 L35 195 L30 205 L38 215" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      {/* Lava crack on right leg */}
      <path d="M85 190 L78 200 L84 210 L77 220" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      {/* Waist connector */}
      <rect x="15" y="162" width="90" height="12" rx="4" fill="#44403c" />
      {/* Massive body — very wide */}
      <rect x="10" y="95" width="100" height="70" rx="8" fill="#78716c" />
      {/* Body shadow */}
      <rect x="10" y="95" width="20" height="70" rx="8" fill="#44403c" opacity="0.6" />
      <rect x="90" y="95" width="20" height="70" rx="8" fill="#44403c" opacity="0.6" />
      {/* Body cracks */}
      <path d="M40 100 L55 115 L48 130 L60 145" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M75 105 L65 118 L72 135" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 130 L45 140 L38 155" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Inner body glow */}
      <ellipse cx="60" cy="130" rx="20" ry="15" fill="#d97706" opacity="0.15" />
      {/* Left shoulder */}
      <rect x="0" y="90" width="18" height="24" rx="6" fill="#44403c" />
      {/* Right shoulder */}
      <rect x="102" y="90" width="18" height="24" rx="6" fill="#44403c" />
      {/* Left arm — thick */}
      <rect x="2" y="112" width="16" height="50" rx="5" fill="#78716c" />
      {/* Left boulder fist */}
      <rect x="0" y="158" width="22" height="20" rx="6" fill="#44403c" />
      <rect x="2" y="160" width="18" height="16" rx="5" fill="#78716c" />
      {/* Fist cracks */}
      <path d="M5 164 L12 170 L8 176" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right arm — thick */}
      <rect x="102" y="112" width="16" height="50" rx="5" fill="#78716c" />
      {/* Right boulder fist */}
      <rect x="98" y="158" width="22" height="20" rx="6" fill="#44403c" />
      <rect x="100" y="160" width="18" height="16" rx="5" fill="#78716c" />
      {/* Fist cracks */}
      <path d="M108 164 L115 170 L110 176" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Neck — thick */}
      <rect x="46" y="80" width="28" height="18" rx="5" fill="#78716c" />
      {/* Boulder head — large square */}
      <rect x="28" y="42" width="64" height="42" rx="8" fill="#78716c" />
      {/* Head shadow */}
      <rect x="28" y="42" width="15" height="42" rx="8" fill="#44403c" opacity="0.5" />
      {/* Head cracks */}
      <path d="M48 48 L56 58 L52 70 L60 78" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M72 46 L68 60 L74 72" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      {/* Eyes — orange glowing slits */}
      <rect x="38" y="58" width="16" height="6" rx="3" fill="#d97706" />
      <rect x="66" y="58" width="16" height="6" rx="3" fill="#d97706" />
      {/* Eye glow */}
      <rect x="40" y="59" width="12" height="4" rx="2" fill="#fb923c" opacity="0.8" />
      <rect x="68" y="59" width="12" height="4" rx="2" fill="#fb923c" opacity="0.8" />
    </svg>
  );
}

// ─── VOIDWALKER ────────────────────────────────────────────────────────────
function VoidwalkerSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Void particles */}
      <circle cx="15" cy="100" r="2.5" fill="#06b6d4" opacity="0.7" />
      <circle cx="108" cy="130" r="2" fill="#7c3aed" opacity="0.6" />
      <circle cx="12" cy="145" r="3" fill="#06b6d4" opacity="0.5" />
      <circle cx="110" cy="90" r="2" fill="#7c3aed" opacity="0.7" />
      <circle cx="20" cy="170" r="2" fill="#06b6d4" opacity="0.4" />
      <circle cx="100" cy="165" r="2.5" fill="#7c3aed" opacity="0.5" />
      <circle cx="8" cy="80" r="2" fill="#06b6d4" opacity="0.6" />
      <circle cx="112" cy="155" r="2" fill="#7c3aed" opacity="0.4" />
      {/* Staff in right hand — long thin rect */}
      <rect x="88" y="55" width="7" height="130" rx="3" fill="#4c1d95" />
      <rect x="90" y="57" width="3" height="126" rx="2" fill="#7c3aed" />
      {/* Staff orb top */}
      <circle cx="91" cy="58" r="8" fill="#06b6d4" opacity="0.9" />
      <circle cx="91" cy="58" r="5" fill="#67e8f9" />
      {/* Staff glow */}
      <circle cx="91" cy="58" r="12" fill="#06b6d4" opacity="0.2" />
      {/* Robe — long flowing shape with jagged bottom */}
      <path d="M28 115 L92 115 L95 185 L85 175 L80 200 L70 185 L60 210 L50 185 L40 200 L35 175 L25 185 Z" fill="#4c1d95" />
      {/* Robe mid layer */}
      <path d="M34 115 L86 115 L88 185 L78 172 L72 196 L60 178 L48 196 L42 172 L32 185 Z" fill="#7c3aed" opacity="0.5" />
      {/* Torso / upper robe */}
      <rect x="34" y="100" width="52" height="20" rx="6" fill="#7c3aed" />
      {/* Left arm extended forward holding orb */}
      <rect x="16" y="108" width="20" height="12" rx="5" fill="#7c3aed" transform="rotate(-15 26 114)" />
      {/* Glowing orb on left hand */}
      <circle cx="15" cy="120" r="12" fill="#06b6d4" opacity="0.4" />
      <circle cx="15" cy="120" r="9" fill="#06b6d4" opacity="0.7" />
      <circle cx="15" cy="120" r="6" fill="#67e8f9" />
      <circle cx="13" cy="117" r="2" fill="white" opacity="0.8" />
      {/* Right arm holding staff */}
      <rect x="82" y="105" width="12" height="40" rx="5" fill="#7c3aed" />
      {/* Hood — flowing */}
      <path d="M28 80 Q60 60 92 80 Q85 70 60 66 Q35 70 28 80 Z" fill="#4c1d95" />
      <path d="M30 88 Q60 65 90 88 Q80 78 60 74 Q40 78 30 88 Z" fill="#2d0a6e" opacity="0.7" />
      {/* Neck */}
      <rect x="52" y="90" width="16" height="14" rx="4" fill="#4c1d95" />
      {/* Head */}
      <ellipse cx="60" cy="76" rx="22" ry="24" fill="#4c1d95" />
      {/* Face */}
      <ellipse cx="60" cy="80" rx="18" ry="18" fill="#3b0764" />
      {/* Angular face lines */}
      <line x1="48" y1="76" x2="60" y2="80" stroke="#7c3aed" strokeWidth="1" opacity="0.6" />
      <line x1="72" y1="76" x2="60" y2="80" stroke="#7c3aed" strokeWidth="1" opacity="0.6" />
      {/* Eyes — cyan glowing */}
      <ellipse cx="52" cy="76" rx="4" ry="3" fill="#06b6d4" />
      <ellipse cx="68" cy="76" rx="4" ry="3" fill="#06b6d4" />
      <ellipse cx="52" cy="76" rx="2.5" ry="2" fill="#67e8f9" />
      <ellipse cx="68" cy="76" rx="2.5" ry="2" fill="#67e8f9" />
    </svg>
  );
}

// ─── EMBERCREST ────────────────────────────────────────────────────────────
function EmbercrestSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flame wisps at feet */}
      <path d="M35 220 Q30 205 38 195 Q34 210 42 200 Q36 215 44 210" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M75 218 Q82 200 76 192 Q80 208 70 198 Q78 212 68 215" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M58 222 Q55 208 62 200 Q57 216 65 206" stroke="#fef08a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Legs */}
      <rect x="40" y="175" width="16" height="45" rx="4" fill="#dc2626" />
      <rect x="64" y="175" width="16" height="45" rx="4" fill="#dc2626" />
      {/* Shin guards */}
      <rect x="39" y="182" width="18" height="12" rx="3" fill="#b91c1c" />
      <rect x="63" y="182" width="18" height="12" rx="3" fill="#b91c1c" />
      {/* Fire markings on legs */}
      <path d="M43 175 L47 183 L43 190" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M69 178 L73 186 L69 194" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      {/* Belt */}
      <rect x="35" y="168" width="50" height="10" rx="3" fill="#b91c1c" />
      <rect x="56" y="168" width="8" height="10" rx="2" fill="#f97316" />
      {/* Torso — athletic */}
      <rect x="36" y="110" width="48" height="62" rx="6" fill="#dc2626" />
      {/* Chest fire markings */}
      <path d="M50 115 L55 125 L50 135 L57 145" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M70 118 L66 128 L71 140" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      {/* Left arm (raised fist) */}
      <rect x="16" y="106" width="22" height="16" rx="6" fill="#dc2626" />
      <rect x="18" y="115" width="14" height="40" rx="5" fill="#dc2626" />
      {/* Left fist */}
      <rect x="16" y="150" width="18" height="16" rx="5" fill="#b91c1c" />
      {/* Right arm (flaming sword arm) */}
      <rect x="82" y="106" width="22" height="16" rx="6" fill="#dc2626" />
      <rect x="88" y="115" width="14" height="35" rx="5" fill="#dc2626" />
      {/* Flaming sword blade */}
      <path d="M93 65 L100 65 L97 118 L90 118 Z" fill="#c0c0c0" />
      <path d="M94 67 L99 67 L96 116 L91 116 Z" fill="#e8e8e8" />
      {/* Flame effects on sword */}
      <path d="M93 75 Q88 68 92 62 Q87 72 91 66 Q86 75 92 70" fill="#f97316" opacity="0.9" />
      <path d="M98 80 Q104 73 100 66 Q105 76 101 70 Q106 80 100 75" fill="#f97316" opacity="0.9" />
      <path d="M94 72 Q91 65 95 58 Q90 68 94 63" fill="#fef08a" opacity="0.8" />
      <path d="M97 78 Q101 70 98 63 Q103 73 99 67" fill="#fef08a" opacity="0.7" />
      {/* Sword guard */}
      <rect x="86" y="115" width="22" height="5" rx="2" fill="#f97316" />
      {/* Sword handle */}
      <rect x="92" y="120" width="7" height="16" rx="2" fill="#78350f" />
      {/* Right shoulder */}
      <rect x="82" y="100" width="24" height="16" rx="6" fill="#b91c1c" />
      {/* Left shoulder */}
      <rect x="14" y="100" width="24" height="16" rx="6" fill="#b91c1c" />
      {/* Neck */}
      <rect x="52" y="92" width="16" height="20" rx="4" fill="#dc2626" />
      {/* Head — angular helmet */}
      <path d="M36 88 L44 62 L60 56 L76 62 L84 88 Z" fill="#dc2626" />
      <path d="M40 88 L47 65 L60 60 L73 65 L80 88 Z" fill="#b91c1c" />
      {/* Helmet visor */}
      <rect x="42" y="75" width="36" height="10" rx="3" fill="#1a0000" />
      <rect x="44" y="76" width="32" height="8" rx="2" fill="#300000" />
      {/* Glowing eyes through visor */}
      <ellipse cx="52" cy="80" rx="4" ry="2.5" fill="#f97316" opacity="0.9" />
      <ellipse cx="68" cy="80" rx="4" ry="2.5" fill="#f97316" opacity="0.9" />
      {/* Helmet chin guard */}
      <rect x="44" y="84" width="32" height="6" rx="3" fill="#dc2626" />
      {/* Flame crest on top of helmet */}
      <path d="M60 56 Q55 45 60 36 Q65 45 60 56" fill="#f97316" />
      <path d="M60 54 Q58 46 62 40 Q63 48 60 54" fill="#fef08a" />
      <path d="M55 58 Q50 47 55 38 Q58 49 55 58" fill="#f97316" opacity="0.8" />
      <path d="M65 58 Q70 47 65 38 Q62 49 65 58" fill="#f97316" opacity="0.8" />
    </svg>
  );
}

// ─── FROSTMANTLE ───────────────────────────────────────────────────────────
function FrostmantleSVG({ scale }: { scale: number }) {
  const w = 120 * scale;
  const h = 230 * scale;
  return (
    <svg width={w} height={h} viewBox="0 0 120 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ice shards floating around */}
      <polygon points="12,95 16,82 20,95" fill="#bae6fd" opacity="0.7" />
      <polygon points="104,110 108,98 112,110" fill="#bae6fd" opacity="0.6" />
      <polygon points="8,145 12,133 16,145" fill="#0ea5e9" opacity="0.5" />
      <polygon points="106,145 110,134 114,145" fill="#bae6fd" opacity="0.6" />
      <polygon points="18,175 22,164 26,175" fill="#bae6fd" opacity="0.4" />
      <polygon points="100,170 103,160 107,170" fill="#0ea5e9" opacity="0.5" />
      {/* Legs — crystalline angular armor */}
      <path d="M38 175 L52 175 L55 220 L35 220 Z" fill="#0ea5e9" />
      <path d="M68 175 L82 175 L85 220 L65 220 Z" fill="#0ea5e9" />
      {/* Leg facets */}
      <path d="M40 175 L50 175 L52 195 Z" fill="#bae6fd" opacity="0.4" />
      <path d="M70 175 L80 175 L75 195 Z" fill="#bae6fd" opacity="0.4" />
      {/* Crystal knee caps */}
      <polygon points="38,188 52,188 56,180 34,180" fill="#bae6fd" />
      <polygon points="68,188 82,188 86,180 64,180" fill="#bae6fd" />
      {/* Waist / belt */}
      <rect x="32" y="168" width="56" height="10" rx="2" fill="#0369a1" />
      <polygon points="56,168 64,168 62,178 58,178" fill="#bae6fd" />
      {/* Body — angular crystalline armor */}
      <path d="M32 108 L88 108 L92 168 L28 168 Z" fill="#0ea5e9" />
      {/* Body facets */}
      <path d="M32 108 L60 108 L60 168 L28 168 Z" fill="#0284c7" opacity="0.4" />
      <path d="M60 108 L88 108 L92 168 L60 168 Z" fill="#bae6fd" opacity="0.2" />
      {/* Chest facet lines */}
      <line x1="60" y1="110" x2="60" y2="165" stroke="#bae6fd" strokeWidth="1.5" opacity="0.5" />
      <line x1="34" y1="130" x2="86" y2="130" stroke="#bae6fd" strokeWidth="1" opacity="0.4" />
      <line x1="36" y1="148" x2="84" y2="148" stroke="#bae6fd" strokeWidth="1" opacity="0.4" />
      {/* Left shoulder */}
      <polygon points="14,100 36,100 32,118 10,118" fill="#0ea5e9" />
      <polygon points="14,100 36,100 30,108 12,108" fill="#bae6fd" opacity="0.4" />
      {/* Right shoulder */}
      <polygon points="84,100 106,100 110,118 88,118" fill="#0ea5e9" />
      <polygon points="84,100 106,100 102,108 86,108" fill="#bae6fd" opacity="0.4" />
      {/* Left arm (holding hex shield) */}
      <rect x="12" y="116" width="18" height="44" rx="4" fill="#0ea5e9" />
      {/* Hexagonal crystal shield */}
      <polygon points="2,125 10,112 24,112 32,125 24,138 10,138" fill="#0284c7" />
      <polygon points="4,125 11,114 23,114 30,125 23,136 11,136" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.5" />
      {/* Shield facets */}
      <line x1="17" y1="114" x2="17" y2="136" stroke="#bae6fd" strokeWidth="1" opacity="0.6" />
      <line x1="6" y1="125" x2="28" y2="125" stroke="#bae6fd" strokeWidth="1" opacity="0.5" />
      {/* Right arm holding lance */}
      <rect x="90" y="116" width="18" height="42" rx="4" fill="#0ea5e9" />
      {/* Ice lance — long diagonal */}
      <path d="M96 160 L110 60" stroke="#bae6fd" strokeWidth="6" strokeLinecap="round" />
      <path d="M97 158 L111 62" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Lance tip */}
      <polygon points="110,60 106,72 114,72" fill="#bae6fd" />
      <polygon points="110,60 107,70 113,70" fill="white" opacity="0.7" />
      {/* Neck */}
      <rect x="50" y="94" width="20" height="16" rx="4" fill="#0ea5e9" />
      {/* Head — sharp angular crystal helmet */}
      <path d="M34 94 L46 70 L60 62 L74 70 L86 94 Z" fill="#0ea5e9" />
      <path d="M38 94 L49 73 L60 66 L71 73 L82 94 Z" fill="#0284c7" />
      {/* Visor slit */}
      <rect x="43" y="80" width="34" height="8" rx="2" fill="#082f49" />
      <rect x="45" y="81" width="30" height="6" rx="1" fill="#0c4a6e" />
      {/* Glowing eyes */}
      <ellipse cx="53" cy="84" rx="4" ry="2.5" fill="#bae6fd" opacity="0.9" />
      <ellipse cx="67" cy="84" rx="4" ry="2.5" fill="#bae6fd" opacity="0.9" />
      {/* Pointed crown / ice spikes on helmet */}
      <polygon points="55,64 58,42 61,64" fill="#bae6fd" />
      <polygon points="60,62 63,38 66,62" fill="#bae6fd" />
      <polygon points="48,68 50,52 54,68" fill="#bae6fd" opacity="0.7" />
      <polygon points="66,68 70,52 72,68" fill="#bae6fd" opacity="0.7" />
      {/* Crown tips glow */}
      <circle cx="58" cy="43" r="2.5" fill="#7dd3fc" opacity="0.8" />
      <circle cx="63" cy="39" r="2" fill="white" opacity="0.7" />
    </svg>
  );
}

// ─── Character Renderer ────────────────────────────────────────────────────
function renderCharacter(character: string, scale: number) {
  const key = character.toLowerCase().replace(/\s+/g, "");
  switch (key) {
    case "ironclad":
      return <IroncladSVG scale={scale} />;
    case "shadowblade":
      return <ShadowbladeSVG scale={scale} />;
    case "stoneforged":
      return <StoneforgedSVG scale={scale} />;
    case "voidwalker":
      return <VoidwalkerSVG scale={scale} />;
    case "embercrest":
      return <EmbercrestSVG scale={scale} />;
    case "frostmantle":
      return <FrostmantleSVG scale={scale} />;
    default:
      // Fallback to Ironclad
      return <IroncladSVG scale={scale} />;
  }
}

// ─── FighterSprite Component ───────────────────────────────────────────────
export default function FighterSprite({
  character,
  side,
  action,
  size = 200,
}: FighterSpriteProps) {
  const ratio = size / 230;

  useEffect(() => {
    if (document.getElementById(FIGHTER_SPRITE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = FIGHTER_SPRITE_STYLE_ID;
    style.textContent = KEYFRAME_CSS;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      style={{
        width: size * (120 / 230),
        height: size,
        transform: side === "right" ? "scaleX(-1)" : "none",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          animation: actionAnimation[action] ?? actionAnimation.idle,
          transformOrigin: "center bottom",
        }}
      >
        {renderCharacter(character, ratio)}
      </div>
    </div>
  );
}
