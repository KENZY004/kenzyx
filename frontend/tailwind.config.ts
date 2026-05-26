import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kenyx: {
          // ── Backgrounds ──────────────────────────────
          bg:        "#090c10",
          surface:   "#0d1117",
          surface2:  "#141c24",
          surface3:  "#1c2636",

          // ── Borders ──────────────────────────────────
          border:         "rgba(255,255,255,0.07)",
          "border-hover": "rgba(255,255,255,0.14)",

          // ── Accent — Kenyx Lime (signature) ──────────
          accent:       "#a8ff3e",
          "accent-dim": "rgba(168,255,62,0.1)",
          "accent-glow":"rgba(168,255,62,0.2)",

          // ── Secondary — electric cyan ─────────────────
          cyan:       "#3ee8ff",
          "cyan-dim": "rgba(62,232,255,0.1)",

          // ── Semantic ──────────────────────────────────
          success:        "#3fb950",
          "success-dim":  "rgba(63,185,80,0.12)",
          warning:        "#e3b341",
          "warning-dim":  "rgba(227,179,65,0.12)",
          danger:         "#f85149",
          "danger-dim":   "rgba(248,81,73,0.12)",

          // ── Text ──────────────────────────────────────
          "text-primary":   "#e6edf3",
          "text-secondary": "#8b949e",
          "text-muted":     "#484f58",

          // ── Difficulty ────────────────────────────────
          easy:   "#3fb950",
          medium: "#e3b341",
          hard:   "#f85149",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs":  ["0.65rem", { lineHeight: "1rem" }],
        "9xl":  ["8rem",    { lineHeight: "0.9" }],
        "10xl": ["10rem",   { lineHeight: "0.85" }],
      },

      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.02em",
      },

      backgroundImage: {
        // Fine grid — structural, editorial
        "grid-fine":  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "grid-coarse":"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",

        // Accent glow
        "kenyx-glow": "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(168,255,62,0.08) 0%, transparent 70%)",
        "kenyx-card": "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",

        // No gradient text — using lime flat
        "none": "none",
      },

      backgroundSize: {
        "grid-sm": "32px 32px",
        "grid-md": "64px 64px",
        "grid-lg": "128px 128px",
      },

      boxShadow: {
        // Lime glow
        "accent-sm":  "0 0 16px rgba(168,255,62,0.15)",
        "accent-md":  "0 0 32px rgba(168,255,62,0.2)",
        "accent-lg":  "0 0 64px rgba(168,255,62,0.15), 0 0 120px rgba(168,255,62,0.05)",

        // Card depth
        "card":    "0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)",
        "card-hover":"0 1px 0 rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.5)",

        // Inset top edge
        "inner-top": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },

      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "marquee": {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        "draw-line": {
          "0%":   { width: "0%" },
          "100%": { width: "100%" },
        },
        "counter": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up":  "fade-up 0.6s ease-out forwards",
        "fade-in":  "fade-in 0.4s ease-out forwards",
        "marquee":  "marquee 30s linear infinite",
        "blink":    "blink 1s step-end infinite",
        "draw-line":"draw-line 0.8s ease-out forwards",
        "counter":  "counter 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
