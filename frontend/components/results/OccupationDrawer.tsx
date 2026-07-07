"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import ConfidenceRing from "./ConfidenceRing";
import type { SearchResult } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface OccupationDrawerProps {
  result: SearchResult | null;
  onClose: () => void;
}

export default function OccupationDrawer({ result, onClose }: OccupationDrawerProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (result) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [result]);

  return (
    <AnimatePresence>
      {result && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-text/40 backdrop-blur-[2px] z-[100]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-surface shadow-[-4px_0_24px_rgba(0,0,0,0.1)] z-[101] flex flex-col border-l border-border"
            role="dialog"
            aria-label="Occupation details"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border bg-bg-subtle shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <span className="inline-block px-2.5 py-1 mb-2 bg-primary-soft/10 text-primary font-mono text-sm font-bold rounded-md">
                  {result.nco_code}
                </span>
                <h2 className="text-xl font-bold text-text leading-tight">
                  {result.display_title || result.title}
                </h2>
              </div>
              <button
                className="p-2 rounded-full hover:bg-surface border border-transparent hover:border-border text-text-muted hover:text-text transition-all shrink-0"
                onClick={onClose}
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Confidence */}
              <div className="flex items-center gap-4 bg-surface border border-border p-4 rounded-card shadow-sm">
                <ConfidenceRing value={result.confidence} size={56} />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    AI Confidence Match
                  </span>
                  <span className="text-2xl font-bold text-text">
                    {result.confidence}%
                  </span>
                </div>
              </div>

              {/* Reason */}
              {result.reason && (
                <section>
                  <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Why This Match
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed bg-primary-soft/5 border border-primary/20 p-4 rounded-card">
                    {result.reason}
                  </p>
                </section>
              )}

              {/* Summary */}
              {result.summary && (
                <section>
                  <h3 className="text-sm font-bold text-text mb-2">Summary</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {result.summary}
                  </p>
                </section>
              )}

              {/* Full Description */}
              <section>
                <h3 className="text-sm font-bold text-text mb-2">Full Description</h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {result.description}
                </p>
              </section>

              {/* Classification Hierarchy */}
              <section>
                <h3 className="text-sm font-bold text-text mb-4">Classification Hierarchy</h3>
                <div className="space-y-3 bg-bg-subtle border border-border rounded-card p-4">
                  {[
                    { label: "Division", value: result.division_name, code: result.division_code },
                    { label: "Group", value: result.group_name },
                    { label: "Family", value: result.family_name },
                  ].map((item, i) => (
                    item.value && (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                        <span className="text-xs font-medium text-text-muted w-16 shrink-0 uppercase tracking-wide">
                          {item.label}
                        </span>
                        <span className="text-sm text-text-secondary font-medium">
                          {item.code && <span className="font-mono text-primary mr-2 bg-primary-soft/10 px-1.5 py-0.5 rounded">{item.code}</span>}
                          {item.value}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </section>

              {/* Search Metadata */}
              <section>
                <h3 className="text-sm font-bold text-text mb-4">Search Metadata</h3>
                <div className="bg-bg-subtle border border-border rounded-card divide-y divide-border">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-xs font-medium text-text-muted uppercase">Vector Score</span>
                    <span className="text-sm font-mono text-text-secondary">{result.score.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-xs font-medium text-text-muted uppercase">Confidence</span>
                    <span className="text-sm font-mono text-text-secondary">{result.confidence}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-xs font-medium text-text-muted uppercase">NCO Code</span>
                    <span className="text-sm font-mono text-primary font-bold">{result.nco_code}</span>
                  </div>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
