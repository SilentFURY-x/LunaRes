/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        primaryText: "var(--primaryText)",
        secondaryText: "var(--secondaryText)",
        divider: "var(--divider)",
        ctaBtn: "var(--ctaBtn)",
        inputBorder: "var(--inputBorder)",
        pillBtnBg: "var(--pillBtnBg)",
        glassBase: "var(--glassBase)",
        glassActive: "var(--glassActive)",
        glassHover: "var(--glassHover)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        rippling: {
          "0%": { opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      animation: {
        rippling: "rippling var(--duration) ease-out",
      },
    },
  },
  plugins: [],
};
