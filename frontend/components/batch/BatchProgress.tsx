"use client";

import React, { useState } from "react";
import { Play, Pause, Trash2, ShieldAlert } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface BatchProgressProps {
  status: "idle" | "processing" | "paused" | "completed";
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  eta: number | null;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export default function BatchProgress({
  status,
  totalCount,
  processedCount,
  successCount,
  errorCount,
  eta,
  onPause,
  onResume,
  onCancel,
}: BatchProgressProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const percent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  const formatETA = (seconds: number | null) => {
    if (seconds === null) return "Estimating...";
    if (seconds <= 0) return "Finished";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className="w-full max-w-[880px] mx-auto p-5 sm:p-6 shadow-md border-border relative overflow-hidden animate-in fade-in duration-300">
      {/* Background ambient pulse when processing */}
      {status === "processing" && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
      )}

      <div className="relative flex flex-col gap-6">
        {/* Top summary stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-text text-lg flex items-center gap-2">
              {status === "processing" && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              )}
              {status === "paused" && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
              {status === "processing" ? "Coding Occupations..." : "Job Paused"}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Coded {processedCount} of {totalCount} rows ({percent}%)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary">
            <span className="px-2.5 py-1 rounded bg-success/15 text-success font-medium">
              {successCount} Success
            </span>
            <span className="px-2.5 py-1 rounded bg-danger/15 text-danger font-medium">
              {errorCount} Errors
            </span>
            <span className="px-2.5 py-1 rounded bg-bg border border-border">
              ETA: <span className="text-text font-bold">{formatETA(eta)}</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-5 rounded-full bg-bg border border-border/80 overflow-hidden flex items-center">
          <div
            className="h-full bg-signature-gradient rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-extrabold text-text mix-blend-difference font-mono uppercase tracking-wider">
              {percent}% Completed
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <div className="flex gap-2">
            {status === "processing" ? (
              <Button onClick={onPause} variant="pill" className="h-10 px-4">
                <Pause className="w-4 h-4 mr-2" />
                Pause Job
              </Button>
            ) : (
              <Button onClick={onResume} variant="pill" className="h-10 px-4 bg-primary text-white border-none">
                <Play className="w-4 h-4 mr-2 fill-current" />
                Resume Job
              </Button>
            )}

            {!showCancelConfirm && (
              <Button
                onClick={() => setShowCancelConfirm(true)}
                variant="ghost"
                className="h-10 text-danger hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>

          {showCancelConfirm && (
            <div className="flex items-center gap-3 bg-danger/5 border border-danger/20 px-3 py-1.5 rounded-btn animate-in slide-in-from-right-4 duration-200">
              <span className="text-xs font-semibold text-danger flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Confirm cancel? All progress will be lost.
              </span>
              <button
                onClick={onCancel}
                className="text-xs font-bold text-danger hover:underline px-1"
              >
                Yes
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs font-semibold text-text-secondary hover:text-text px-1"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
