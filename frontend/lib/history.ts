// Client-side recent-search history, persisted in localStorage.
const KEY = "nco_history_v1";
const MAX = 12;

export function getHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addHistory(query: string): string[] {
  const q = query.trim();
  if (!q) return getHistory();
  const existing = getHistory().filter((x) => x.toLowerCase() !== q.toLowerCase());
  const next = [q, ...existing].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  return next;
}

export function clearHistory(): string[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}
