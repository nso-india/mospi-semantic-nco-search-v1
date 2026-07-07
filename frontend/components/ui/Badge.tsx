"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "outline";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span className={`sw-badge sw-badge--${variant} ${className}`}>
      {children}
    </span>
  );
}
