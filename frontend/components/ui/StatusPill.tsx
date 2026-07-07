"use client";

import React from "react";

export default function StatusPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill border border-border bg-surface shadow-sm w-fit">
      <div className="w-2 h-2 rounded-full bg-success"></div>
      <span className="text-xs font-mono font-medium text-text-secondary tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
