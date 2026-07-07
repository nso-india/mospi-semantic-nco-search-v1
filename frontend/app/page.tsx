"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  // Clear any existing session on the landing page, 
  // so the user is forced to re-select their role.
  useEffect(() => {
    localStorage.removeItem("userMode");
  }, []);

  const handleGeneralUser = () => {
    localStorage.setItem("userMode", "general");
    router.push("/search");
  };

  const handleAdmin = () => {
    // Admin goes to login first
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] font-sans px-4">
      {/* Logos */}
      <motion.div 
        className="flex items-center gap-6 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img src="/mospi-logo.webp" alt="Govt of India" className="h-20 sm:h-24 w-auto object-contain drop-shadow-md" />
        <img src="/data-for-development-logo.webp" alt="Data for Development" className="h-20 sm:h-24 w-auto object-contain drop-shadow-md hidden sm:block" />
      </motion.div>

      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--primary)] tracking-tight font-serif mb-3">
          NCO Code Semantic Search Tool - MoSPI
        </h1>
        <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-lg mx-auto">
          Please select your role to proceed to the NCO 2015 Occupation Search Tool.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        
        {/* General User Card */}
        <motion.button
          onClick={handleGeneralUser}
          className="flex-1 flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg rounded-2xl p-8 transition-all duration-300 group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] group-hover:bg-[var(--primary)]/10 flex items-center justify-center mb-6 transition-colors">
            <User className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">General User</h2>
          <p className="text-[var(--text-muted)] text-sm text-center">
            Access the semantic search engine and batch coding features.
          </p>
        </motion.button>

        {/* Admin Card */}
        <motion.button
          onClick={handleAdmin}
          className="flex-1 flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--violet)] hover:shadow-lg rounded-2xl p-8 transition-all duration-300 group"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] group-hover:bg-[var(--violet)]/10 flex items-center justify-center mb-6 transition-colors">
            <ShieldAlert className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-[var(--violet)] transition-colors" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Administrator</h2>
          <p className="text-[var(--text-muted)] text-sm text-center">
            Login to access live dashboard tracking and performance audits.
          </p>
        </motion.button>

      </div>
    </div>
  );
}
