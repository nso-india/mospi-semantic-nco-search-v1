"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <div className="mt-auto pt-16 flex flex-col items-center">
      <div className="mb-8 w-full flex justify-center">
        <Link href="/feedback" className="px-6 py-2.5 bg-surface border border-border text-text-secondary text-[13px] font-semibold shadow-sm hover:border-border-strong hover:bg-bg-subtle transition-colors">
          Provide Feedback
        </Link>
      </div>
      
      <footer className="w-full bg-primary py-4 px-4 text-center">
        <p className="text-[11px] text-white/90">
          © 2026 Developed by Data Informatics & Innovation Division, Ministry of Statistics & Programme Implementation, Government of India | Disclaimer | Terms of Use | Feedback | version-v1.0
        </p>
      </footer>
    </div>
  );
}
