/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // BattleForge Brand
        "arc-cyan": "#00E5FF",
        "void-purple": "#7B2FFF",
        "storm-gold": "#FFD600",
        "danger-red": "#FF3D6B",
        "victory-green": "#00FF9D",
        "deep-navy": "#0D1528",
        "card-surface": "#111827",
        "card-border": "#1A2545",
        "primary-text": "#E8F4FF",
        "secondary-text": "#3A5080",
        // Rank colors
        "rank-iron": "#6B7280",
        "rank-bronze": "#CD7F32",
        "rank-steel": "#00BFFF",
        "rank-obsidian": "#9B59B6",
        "rank-void": "#7B2FFF",
        "rank-inferno": "#FF3D6B",
        "rank-eternal": "#FFD600",
      },
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        ui: ['"Barlow Condensed"', "sans-serif"],
        body: ["Barlow", "sans-serif"],
      },
      backgroundImage: {
        "xp-gradient": "linear-gradient(90deg, #7B2FFF, #00E5FF)",
      },
    },
  },
  plugins: [],
};
