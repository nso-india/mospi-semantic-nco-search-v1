"use client";

import React, { useState } from "react";
import ConfidenceRing from "./ConfidenceRing";
import type { SearchResult } from "@/lib/types";
import { assignCode, submitFeedback } from "@/lib/api";
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ResultCardProps {
  result: SearchResult;
  index: number;
  rank?: number;
  onOpenDrawer: (result: SearchResult) => void;
  searchLogId?: number | null;
  query: string;
}

const RANK_LABELS: Record<number, { text: string; className: string }> = {
  0: { text: "BEST MATCH", className: "bg-success/10 text-success border-success/20" },
  1: { text: "MATCH #2", className: "bg-primary-soft/10 text-primary border-primary/20" },
  2: { text: "MATCH #3", className: "bg-bg-subtle text-text-muted border-border" },
  3: { text: "MATCH #4", className: "bg-bg-subtle text-text-muted border-border" },
  4: { text: "MATCH #5", className: "bg-bg-subtle text-text-muted border-border" },
};

export default function ResultCard({
  result,
  index,
  rank = index,
  onOpenDrawer,
  searchLogId = null,
  query,
}: ResultCardProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const isTopMatch = index === 0;

  async function handleFeedback(type: "up" | "down") {
    const isRemove = feedback === type;
    const nextFeedback = isRemove ? null : type;
    setFeedback(nextFeedback);

    try {
      await submitFeedback({
        search_log_id: searchLogId,
        nco_code: result.nco_code,
        query: query,
        positive: type === "up" && !isRemove,
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  }

  // Extract hierarchy for the Division/Group/Sub-group display
  const hierarchyNodes = result.hierarchy_path ? result.hierarchy_path.split(" > ") : [];
  const division = hierarchyNodes[0] || result.division_code || "N/A";
  const group = hierarchyNodes[1] || "N/A";
  const subGroup = hierarchyNodes[2] || "N/A";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(result.nco_code);
  };

  return (
    <div 
      className={`bg-bg-subtle border-l-2 border-primary rounded-sm p-5 sm:p-6 transition-all duration-300 flex flex-col gap-4 ${
        isTopMatch ? "shadow-sm relative z-10" : ""
      }`}
    >
      {/* Top Row: Code and Copy Button */}
      <div className="flex items-start justify-between w-full">
        <div className="text-xl font-bold text-primary tracking-tight font-serif">
          {result.nco_code}
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-1.5 bg-surface border border-border text-[12px] font-semibold text-text-secondary hover:bg-bg-subtle hover:text-primary transition-colors flex items-center gap-2 rounded-sm"
        >
          Copy Code
        </button>
      </div>

      {/* Title */}
      <div className="text-[14px] font-semibold text-text-secondary leading-snug font-serif pr-4">
        {result.display_title || result.title}
        {result.summary && (
          <p className="text-[13px] text-text-muted mt-1 font-sans font-normal">
            {result.summary}
          </p>
        )}
      </div>

      <div className="h-px bg-border/80 w-full mt-2 mb-1" />

      {/* Hierarchy Row */}
      <div className="flex items-center w-full max-w-xl">
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">Division</span>
          <span className="text-[13px] text-primary font-medium">{division}</span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">Group</span>
          <span className="text-[13px] text-primary font-medium">{group}</span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider">Sub-Group</span>
          <span className="text-[13px] text-primary font-medium">{subGroup}</span>
        </div>
      </div>

      {/* Existing functional features, kept subtle so as not to disrupt the design */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-primary transition-colors"
          >
            {expanded ? "Hide details" : "Show details"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onOpenDrawer(result)}
            className="text-[11px] font-medium text-text-muted hover:text-primary transition-colors"
          >
            View Details
          </button>
          {/* Rank Badge if exists */}
          {rank in RANK_LABELS && rank > 0 && (
            <span className="text-[10px] bg-white border px-1.5 py-0.5 text-text-muted rounded-sm">
              Rank {rank}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="scale-75 origin-right">
             <ConfidenceRing value={result.confidence} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleFeedback("up")}
              className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                feedback === "up" 
                  ? "bg-success/10 border-success text-success" 
                  : "bg-surface border-border text-text-muted hover:border-primary hover:text-primary"
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback("down")}
              className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                feedback === "down" 
                  ? "bg-danger/10 border-danger text-danger" 
                  : "bg-surface border-border text-text-muted hover:border-primary hover:text-primary"
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="text-[13px] text-text-secondary mt-2">
          {result.reason && (
            <div className="mb-2 p-2 bg-primary-soft/5 border-l-[2px] border-primary text-[12px]">
              <strong className="text-primary mr-1">Why:</strong> {result.reason}
            </div>
          )}
          <p>{result.description}</p>
        </div>
      )}
    </div>
  );
}
