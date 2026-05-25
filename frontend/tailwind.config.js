export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        neon: "0 0 25px rgba(168, 85, 247, 0.45)",
        soft: "0 20px 80px rgba(0,0,0,0.35)"
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-16px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 18px rgba(168,85,247,.35)" },
          "50%": { boxShadow: "0 0 38px rgba(59,130,246,.55)" }
        }
      }
    }
  },
  plugins: []
};