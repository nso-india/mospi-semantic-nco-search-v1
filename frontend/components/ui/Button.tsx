"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ArrowRight } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "pill";
  withArrow?: boolean;
}

export default function Button({ 
  variant = "primary", 
  withArrow = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-signature-gradient text-white shadow-sm hover:shadow-md hover:scale-[1.02] rounded-btn px-5 py-2.5",
    ghost: "text-text-secondary hover:text-text hover:bg-bg-subtle rounded-btn px-4 py-2",
    pill: "bg-surface border border-border hover:border-primary-soft text-text-secondary hover:text-primary rounded-pill px-4 py-1.5 shadow-sm hover:shadow"
  };

  return (
    <button 
      className={cn(baseClasses, variants[variant], className)}
      {...props}
    >
      {children}
      {withArrow && <ArrowRight className="w-4 h-4 ml-2" />}
    </button>
  );
}
