"use client";

import React from "react";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export default function Chip({ children, className = "", ...props }: ChipProps) {
  return (
    <button 
      className={`px-8 py-2 rounded-full border border-border bg-surface text-[13px] font-medium text-text-secondary hover:text-primary hover:border-primary-soft transition-colors flex-1 min-w-[150px] max-w-[250px] truncate justify-center ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
