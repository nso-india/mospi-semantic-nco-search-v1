"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/lib/LanguageContext";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const [highlightLanguage, setHighlightLanguage] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [tempLang, setTempLang] = useState(language);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#language") {
      setHighlightLanguage(true);
      const timer = setTimeout(() => setHighlightLanguage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSave = () => {
    setLanguage(tempLang);
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="max-w-[880px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">{t("Settings")}</h1>
        <p className="text-text-secondary mt-1">Manage your application preferences and defaults.</p>
      </div>

      <AnimatePresence>
        {showSaveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 right-0 mt-2 mr-4 z-50 flex items-center gap-2 bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 px-4 py-2 rounded-lg shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Settings saved successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="divide-y divide-border relative">
        <div 
          id="language"
          className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-700 ${
            highlightLanguage ? "bg-primary-soft/20 shadow-[inset_4px_0_0_0_var(--primary)]" : ""
          }`}
        >
          <div>
            <h3 className="font-semibold text-text">Default Search Language</h3>
            <p className="text-sm text-text-muted mt-1">Which language should the AI assume if auto-detect fails?</p>
          </div>
          <select 
            value={tempLang}
            onChange={(e) => setTempLang(e.target.value as any)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus:border-primary"
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Tamil">Tamil</option>
            <option value="Telugu">Telugu</option>
          </select>
        </div>

        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text">Results per search</h3>
            <p className="text-sm text-text-muted mt-1">Number of matches to return for each query.</p>
          </div>
          <select className="bg-bg-subtle border border-border rounded-md px-3 py-2 text-sm text-text outline-none focus:border-primary">
            <option>5 results</option>
            <option>8 results</option>
            <option>10 results</option>
            <option>15 results</option>
          </select>
        </div>

        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text">Voice Input</h3>
            <p className="text-sm text-text-muted mt-1">Enable microphone access for voice search.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-bg-subtle border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
          </label>
        </div>

        <div className="p-6 flex items-center justify-end gap-3 bg-bg-subtle/50">
          <Button variant="ghost">{t("Cancel")}</Button>
          <Button variant="primary" onClick={handleSave}>{t("SaveChanges")}</Button>
        </div>
      </Card>
    </div>
  );
}
