"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Layers, Home, Settings, LogOut, Menu } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    setIsAdmin(localStorage.getItem("userMode") === "admin");
  }, [pathname]);

  const handleLogout = async () => {
    try {
      // Always attempt to logout to destroy any residual backend cookie
      await fetch(`/api/auth/web/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      localStorage.removeItem("userMode");
      router.push("/");
      router.refresh();
    }
  };

  const navLinks = [
    ...(isAdmin ? [{ name: t("Dashboard"), href: "/dashboard", icon: LayoutGrid }] : []),
    { name: t("Batch Coding"), href: "/batch", icon: Layers },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-[80px] bg-surface/95 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Menu & Logos */}
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 text-text-muted hover:text-text transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/search" className="flex items-center gap-3 group">
          <img src="/mospi-logo.webp" alt="Govt of India" className="h-10 sm:h-12 w-auto object-contain" />
          <img src="/data-for-development-logo.webp" alt="Data for Development" className="h-10 sm:h-12 w-auto object-contain hidden sm:block" />
        </Link>
      </div>

      {/* Center: Title */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center px-4 pointer-events-none overflow-hidden">
        <h1 className="text-[1.1rem] xl:text-[22px] font-bold text-primary tracking-tight font-serif truncate w-full">
          MoSPI AI-Powered NCO Code Semantic Search Tool<sup className="text-[10px] font-normal text-text-muted ml-1 relative -top-2">Beta</sup>
        </h1>
        <p className="text-[12px] xl:text-[13px] text-text-secondary mt-0.5 truncate w-full">Data Informatics and Innovation Division</p>
      </div>

      {/* Right: Functional Icons (Preserved) */}
      <div className="flex items-center gap-1 sm:gap-2">
        <nav className="hidden xl:flex items-center gap-1 mr-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
               <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                  isActive 
                    ? "text-primary bg-bg-subtle" 
                    : "text-text-secondary hover:text-text hover:bg-bg-subtle"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="hidden xl:block w-px h-6 bg-border mx-2"></div>

        <Link href="/search" className="p-2 text-text-secondary hover:text-primary hover:bg-bg-subtle rounded-btn transition-colors" aria-label="Home">
          <Home className="w-5 h-5" />
        </Link>
        <Link href="/settings" className="p-2 text-text-secondary hover:text-primary hover:bg-bg-subtle rounded-btn transition-colors" aria-label="Settings">
          <Settings className="w-5 h-5" />
        </Link>
        <button 
          onClick={handleLogout}
          className="ml-1 flex items-center gap-2 px-3 py-1.5 bg-bg-subtle border border-border hover:border-danger hover:text-danger rounded-pill transition-colors text-sm font-medium text-text-secondary"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{t("Logout")}</span>
        </button>
      </div>
    </header>
  );
}
