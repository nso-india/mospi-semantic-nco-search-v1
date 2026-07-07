import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-subtle": "var(--bg-subtle)",
        surface: "var(--surface)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          soft: "var(--primary-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        success: "var(--success)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)",
        focus: "0 0 0 4px var(--focus-ring)",
      },
      borderRadius: {
        pill: "9999px",
        btn: "4px",
        card: "4px",
        search: "4px",
      },
      backgroundImage: {
        "signature-gradient": "linear-gradient(135deg, var(--primary) 0%, var(--primary-soft) 100%)",
        "search-gradient": "linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
