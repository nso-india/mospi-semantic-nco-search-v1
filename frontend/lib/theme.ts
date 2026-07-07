// Theme: light / dark / system, persisted in localStorage, applied via data-theme.
export type Theme = "light" | "dark" | "system";
const KEY = "sw_theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(KEY) as Theme) || "system";
}

export function resolved(t: Theme): "light" | "dark" {
  if (t === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return t;
}

export function applyTheme(t: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved(t));
  }
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme(t);
}
