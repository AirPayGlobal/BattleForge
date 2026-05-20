/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // BattleForge — Cyberpunk Arcade Fighter
        "neon-cyan": "#00F0FF",
        "neon-pink": "#FF2BD6",
        "neon-magenta": "#FF1F8F",
        "neon-violet": "#8B3DFF",
        "neon-gold": "#FFC53A",
        "neon-red": "#FF2D55",
        "neon-green": "#3DFFA5",
        "void-black": "#03020A",
        "deep-void": "#070418",
        "panel-bg": "rgba(8, 4, 30, 0.72)",
        "panel-border": "#1A0C40",
        "primary-text": "#E8F4FF",
        "muted-text": "#7F7BB2",
      },
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        ui: ['"Barlow Condensed"', "sans-serif"],
        body: ["Barlow", "sans-serif"],
        mono: ['"Share Tech Mono"', "monospace"],
      },
      backgroundImage: {
        "neon-cyan-pink": "linear-gradient(90deg, #00F0FF, #FF2BD6)",
        "neon-violet-cyan": "linear-gradient(90deg, #8B3DFF, #00F0FF)",
        "neon-gold-red": "linear-gradient(90deg, #FFC53A, #FF2D55)",
      },
      animation: {
        "scan-lines": "scan 8s linear infinite",
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        "menu-glow": "menu-glow 3s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100vh" },
        },
        "pulse-neon": {
          "0%, 100%": { opacity: "0.85", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.25)" },
        },
        "menu-glow": {
          "0%, 100%": { textShadow: "0 0 12px rgba(0, 240, 255, 0.5)" },
          "50%": { textShadow: "0 0 28px rgba(255, 43, 214, 0.8), 0 0 12px rgba(0, 240, 255, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
