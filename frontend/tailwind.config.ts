import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          foreground: "var(--violet-foreground)",
        },
        cyan: {
          DEFAULT: "var(--cyan)",
          foreground: "var(--cyan-foreground)",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)",
        "gradient-brand-radial": "radial-gradient(circle at top left, var(--cyan) 0%, var(--violet) 50%, transparent 100%)",
        "gradient-mesh": "radial-gradient(at 0% 0%, hsla(199,89%,48%,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(262,83%,58%,0.18) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(190,90%,50%,0.14) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(262,83%,58%,0.12) 0px, transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 40px -10px hsla(199,89%,48%,0.45)",
        "glow-violet": "0 0 40px -10px hsla(262,83%,58%,0.45)",
        premium: "0 20px 60px -15px rgba(2, 8, 23, 0.35)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
