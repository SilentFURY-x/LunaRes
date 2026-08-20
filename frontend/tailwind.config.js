/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Design tokens for LunaRes — a deep-space/terrain-analysis palette,
      // deliberately not the generic purple-gradient SaaS default.
      // See docs/frontend design notes below for rationale.
      colors: {
        void: "#0B0E14",       // near-black background, like a lunar-shadow region
        regolith: "#C9C2B4",   // warm grey — lunar surface tone, used for body text
        basalt: "#1B2028",     // panel/surface background
        signal: "#5FA8D3",     // confidence/data accent — cool, instrument-panel blue
        flare: "#E8A33D",      // low-confidence / warning accent — amber, not red
        crater: "#2A3140",     // borders, dividers
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
