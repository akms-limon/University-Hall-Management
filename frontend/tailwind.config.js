/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "rgb(var(--bg-deep) / <alpha-value>)",
          card: "rgb(var(--bg-card) / <alpha-value>)",
          muted: "rgb(var(--bg-muted) / <alpha-value>)",
        },
        text: {
          base: "rgb(var(--text-base) / <alpha-value>)",
          soft: "rgb(var(--text-soft) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
        },
        ui: {
          border: "rgb(var(--ui-border) / <alpha-value>)",
          ring: "rgb(var(--ui-ring) / <alpha-value>)",
        },
        accent: {
          primary: "rgb(var(--accent-primary) / <alpha-value>)",
          secondary: "rgb(var(--accent-secondary) / <alpha-value>)",
          success: "rgb(var(--accent-success) / <alpha-value>)",
          warning: "rgb(var(--accent-warning) / <alpha-value>)",
          danger: "rgb(var(--accent-danger) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Source Sans 3", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(201, 162, 39, 0.35), 0 18px 40px rgba(10, 61, 46, 0.16)",
      },
      backgroundImage: {
        "grid-soft":
          "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-soft": "26px 26px",
      },
    },
  },
  plugins: [],
};
