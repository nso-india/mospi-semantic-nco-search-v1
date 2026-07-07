"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { TrendingUp, BarChart3, PieChart } from "lucide-react";

export default function Metrics() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text">Metrics</h1>
        <p className="text-text-secondary mt-1">Detailed breakdown of semantic search performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-80 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-text">Searches Over Time</h2>
          </div>
          <div className="flex-1 border-b border-l border-border relative flex items-end">
             {/* Placeholder for Recharts AreaChart */}
             <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent flex items-center justify-center">
               <span className="text-text-muted text-sm">[Area Chart Placeholder]</span>
             </div>
          </div>
        </Card>

        <Card className="p-6 h-80 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-text">Confidence Distribution</h2>
          </div>
          <div className="flex-1 border-b border-l border-border relative flex items-end justify-center">
             <div className="flex items-end gap-2 h-full pt-8 pb-1 w-full justify-around px-4">
               {[20, 40, 90, 100, 60, 30].map((h, i) => (
                 <div key={i} className="w-8 bg-primary rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
             </div>
          </div>
        </Card>

        <Card className="p-6 h-80 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-text">Top Languages Used</h2>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-[16px] border-primary/20 relative">
               <div className="absolute inset-[-16px] rounded-full border-[16px] border-transparent border-t-primary border-r-primary rotate-45"></div>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <span className="text-2xl font-bold text-text">64%</span>
                 <span className="text-xs text-text-muted uppercase tracking-wider">English</span>
               </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}