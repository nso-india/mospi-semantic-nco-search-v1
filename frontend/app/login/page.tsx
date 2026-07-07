"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auth/web/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Invalid username or password");
      }

      // Set admin role for the UI
      localStorage.setItem("userMode", "admin");
      // On success, redirect to search
      window.location.href = "/search";
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--violet)] opacity-10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--teal)] opacity-10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-fadeUp">
        {/* Logos */}
        <div className="flex justify-center gap-6 mb-8 items-center bg-[var(--surface)]/50 backdrop-blur-md p-4 rounded-2xl border border-[var(--border)] shadow-sm">
          <img src="/mospi-logo.webp" alt="Govt of India" className="h-14 w-auto object-contain" />
          <div className="w-px h-10 bg-[var(--border)]"></div>
          <img src="/data-for-development-logo.webp" alt="Data for Development" className="h-14 w-auto object-contain" />
        </div>

        {/* Login Card */}
        <div className="dashboard-card p-8 bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--violet)] to-[var(--teal)]"></div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[var(--text)] tracking-tight mb-2">Secure Dashboard Login</h1>
            <p className="text-sm text-[var(--text-secondary)]">Sign in to access MoSPI NCO administration and analytics.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-[var(--danger)] border border-red-200 dark:border-red-800/50 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors placeholder-[var(--text-muted)]"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-colors placeholder-[var(--text-muted)]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[var(--primary)] hover:bg-opacity-90 text-white rounded-lg font-medium text-sm shadow-md transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                "Secure Login"
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Protected by Govt Identity Standards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
