"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { LanguageProvider } from "@/lib/LanguageContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const hideNavigation = pathname === "/" || pathname === "/login";

  return (
    <LanguageProvider>
      <div className="relative min-h-screen bg-bg overflow-x-hidden text-text-secondary">
        {!hideNavigation && <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}
        {!hideNavigation && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

        <div className={`flex min-h-screen relative z-10 ${!hideNavigation ? "pt-20" : ""}`}>
        {/* Main content */}
        <main
          className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
        >
          <div className="flex flex-col min-h-[calc(100vh-80px)]">
            <div className="flex-1 max-w-[1120px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
            <Footer />
          </div>
        </main>
      </div>
      </div>
    </LanguageProvider>
  );
}
