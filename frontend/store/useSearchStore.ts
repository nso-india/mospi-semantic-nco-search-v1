import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  history: string[];
  addHistory: (query: string) => void;
  clearHistory: () => void;
  currentQuery: string;
  setCurrentQuery: (query: string) => void;
  llmMode: "online" | "offline";
  setLlmMode: (mode: "online" | "offline") => void;
  hasPreloadedOffline: boolean;
  setHasPreloadedOffline: (val: boolean) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      history: [],
      addHistory: (query: string) => 
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const filtered = state.history.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
          return { history: [trimmed, ...filtered].slice(0, 15) };
        }),
      clearHistory: () => set({ history: [] }),
      currentQuery: "",
      setCurrentQuery: (query: string) => set({ currentQuery: query }),
      llmMode: "online",
      setLlmMode: (mode) => set({ llmMode: mode }),
      hasPreloadedOffline: false,
      setHasPreloadedOffline: (val) => set({ hasPreloadedOffline: val }),
    }),
    {
      name: 'sw_recent_searches',
      partialize: (state) => ({ 
        history: state.history, 
        llmMode: state.llmMode,
        hasPreloadedOffline: state.hasPreloadedOffline
      }),
    }
  )
);
