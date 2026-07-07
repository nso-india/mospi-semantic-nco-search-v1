"use client";

import React from "react";
import Card from "./Card";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  subtitle: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative mb-6 text-text-muted flex items-center justify-center w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-text-muted/30"></div>
        <Icon className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-text mb-3">{title}</h3>
      <p className="text-text-muted max-w-md mx-auto leading-relaxed">
        {subtitle}
      </p>
    </Card>
  );
}
