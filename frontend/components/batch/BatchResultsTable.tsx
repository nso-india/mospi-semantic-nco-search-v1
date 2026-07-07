"use client";

import React, { useState } from "react";
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { BatchItem } from "../../store/useBatchJob";
import { searchOccupations } from "../../lib/api";
import type { SearchResult } from "../../lib/types";

interface BatchResultsTableProps {
  items: BatchItem[];
  onOverride: (id: string, code: string, title: string, confidence: number) => Promise<void>;
  onFeedback: (id: string, positive: boolean) => Promise<void>;
  onRetryRow: (id: string) => void;
}

export default function BatchResultsTable({
  items,
  onOverride,
  onFeedback,
  onRetryRow,
}: BatchResultsTableProps) {
  const [activeOverrideId, setActiveOverrideId] = useState<string | null>(null);
  const [overrideOptions, setOverrideOptions] = useState<SearchResult[]>([]);
  const [loadingOverride, setLoadingOverride] = useState(false);

  const handleOpenOverride = async (item: BatchItem) => {
    if (activeOverrideId === item.id) {
      setActiveOverrideId(null);
      return;
    }
    setActiveOverrideId(item.id);
    setLoadingOverride(true);
    setOverrideOptions([]);
    try {
      const res = await searchOccupations(item.originalText, 5);
      setOverrideOptions(res.results || []);
    } catch (err) {
      console.error("Failed to load override options", err);
    } finally {
      setLoadingOverride(false);
    }
  };

  const selectOverride = (item: BatchItem, option: SearchResult) => {
    onOverride(item.id, option.nco_code, option.display_title || option.title, option.confidence);
    setActiveOverrideId(null);
  };

  return (
    <div className="w-full max-w-[880px] mx-auto bg-surface rounded-card border border-border shadow-card overflow-hidden animate-in fade-in duration-300">
      <div className="px-6 py-4 border-b border-border bg-bg-subtle">
        <h3 className="font-bold text-text">Live Processing Queue</h3>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-bg-subtle text-text-secondary uppercase tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3.5 text-xs">Status</th>
              <th className="px-5 py-3.5 text-xs">Input Title</th>
              <th className="px-5 py-3.5 text-xs">Assigned NCO</th>
              <th className="px-5 py-3.5 text-xs">Title Match</th>
              <th className="px-5 py-3.5 text-xs">Confidence</th>
              <th className="px-5 py-3.5 text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-secondary bg-surface">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                  No items in queue.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isLowConfidence = item.status === "coded" && item.confidence !== undefined && item.confidence < 70;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-bg-subtle/50 transition-colors ${
                      isLowConfidence ? "border-l-4 border-l-amber-500" : ""
                    }`}
                  >
                    {/* Status Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {item.status === "queued" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-subtle border border-border text-text-muted">
                          Queued
                        </span>
                      )}
                      {item.status === "coding" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Coding...
                        </span>
                      )}
                      {item.status === "coded" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/25">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Coded
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/25">
                          <XCircle className="w-3.5 h-3.5" />
                          Error
                        </span>
                      )}
                    </td>

                    {/* Input Title Column */}
                    <td className="px-5 py-4 font-medium text-text max-w-[180px] truncate">
                      {item.originalText}
                      {item.refId && (
                        <span className="block text-xxs font-mono text-text-muted mt-0.5">
                          ID: {item.refId}
                        </span>
                      )}
                    </td>

                    {/* Assigned Code Column */}
                    <td className="px-5 py-4 font-mono font-bold text-primary whitespace-nowrap">
                      {item.code || "—"}
                    </td>

                    {/* Title Match Column */}
                    <td className="px-5 py-4 max-w-[200px] truncate">
                      {item.title || (item.errorMsg ? (
                        <span className="text-danger flex items-center gap-1 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {item.errorMsg}
                        </span>
                      ) : "—")}
                    </td>

                    {/* Confidence Column */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {item.status === "coded" && item.confidence !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-signature-gradient shadow-sm">
                            {item.confidence}%
                          </span>
                          {isLowConfidence && (
                            <span className="text-amber-500" title="Low match confidence">
                              <AlertTriangle className="w-4 h-4 fill-current" />
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-right whitespace-nowrap relative">
                      <div className="flex items-center justify-end gap-2.5">
                        {/* Override Dropdown Toggle */}
                        {item.status === "coded" && (
                          <div className="relative">
                            <button
                              onClick={() => handleOpenOverride(item)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary border border-border px-2 py-1.5 rounded-btn hover:bg-bg-subtle transition-all"
                            >
                              Override
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {activeOverrideId === item.id && (
                              <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-btn shadow-lg z-20 text-left p-2 animate-in fade-in duration-200">
                                <span className="block text-xxs font-bold text-text-muted px-2 py-1.5 uppercase tracking-wider">
                                  Alternative Matches
                                </span>
                                {loadingOverride ? (
                                  <div className="flex items-center justify-center p-6 text-text-muted">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Loading...
                                  </div>
                                ) : overrideOptions.length === 0 ? (
                                  <div className="px-3 py-2.5 text-xs text-text-muted">
                                    No matches found
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {overrideOptions.map((opt) => (
                                      <button
                                        key={opt.nco_code}
                                        onClick={() => selectOverride(item, opt)}
                                        className="w-full text-left px-2 py-2 rounded hover:bg-bg-subtle transition-colors flex items-center justify-between gap-3"
                                      >
                                        <div className="truncate pr-2">
                                          <span className="font-mono font-bold text-xs text-primary block">
                                            {opt.nco_code}
                                          </span>
                                          <span className="text-xs text-text block truncate">
                                            {opt.display_title || opt.title}
                                          </span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-xxs font-bold text-white bg-signature-gradient">
                                          {opt.confidence}%
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Retry button for Error state */}
                        {item.status === "error" && (
                          <button
                            onClick={() => onRetryRow(item.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-primary border border-border px-2 py-1.5 rounded-btn hover:bg-bg-subtle transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                          </button>
                        )}

                        {/* Thumbs Feedback */}
                        {item.status === "coded" && (
                          <div className="flex items-center border border-border rounded-btn overflow-hidden">
                            <button
                              onClick={() => onFeedback(item.id, true)}
                              className={`p-1.5 transition-all ${
                                item.feedback === true
                                  ? "bg-success/15 text-success"
                                  : "text-text-muted hover:text-text hover:bg-bg-subtle"
                              }`}
                              title="Correct mapping"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-[1px] h-4 bg-border" />
                            <button
                              onClick={() => onFeedback(item.id, false)}
                              className={`p-1.5 transition-all ${
                                item.feedback === false
                                  ? "bg-danger/15 text-danger"
                                  : "text-text-muted hover:text-text hover:bg-bg-subtle"
                              }`}
                              title="Incorrect mapping"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
