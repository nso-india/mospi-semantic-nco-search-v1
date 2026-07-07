"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useSearchStore } from "@/store/useSearchStore";
import { useRouter } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { history, setCurrentQuery } = useSearchStore();
  const router = useRouter();

  // Prevent hydration mismatch for persisted store by deferring render slightly
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay — visible on all screens when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-20 left-0 h-[calc(100vh-5rem)] bg-bg-subtle border-r border-border
          w-[280px] z-50 flex flex-col shrink-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button inside sidebar */}
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-text-muted">
            Recent Searches
          </h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col overflow-hidden">

          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-80">
              <div className="relative mb-4 text-text-muted flex items-center justify-center w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-text-muted/40"></div>
                <Search className="w-6 h-6" />
              </div>
              <p className="font-bold text-text mb-1">No searches yet</p>
              <p className="text-sm text-text-muted max-w-[220px]">
                Your recent occupation lookups will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1 overflow-y-auto pr-2">
              {history.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setCurrentQuery(q);
                      router.push("/search");
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-left hover:bg-surface hover:shadow-sm border border-transparent hover:border-border transition-all group"
                  >
                    <div className="w-7 h-7 rounded-full border border-border/50 bg-surface flex items-center justify-center shrink-0 group-hover:border-primary/20">
                      <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-primary" />
                    </div>
                    <span className="truncate text-sm font-medium text-text-secondary group-hover:text-text">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
