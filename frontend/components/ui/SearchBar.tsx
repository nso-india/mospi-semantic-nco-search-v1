"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Mic, ArrowRight, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
  loading?: boolean;
}

export default function SearchBar({ value, onChange, onSearch, loading }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value);
  };

  const toggleMic = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        setIsTranscribing(true);
        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Transcription failed");
          }

          const data = await response.json();
          if (data.transcript) {
            const currentVal = valueRef.current;
            onChange(currentVal ? currentVal + " " + data.transcript : data.transcript);
          }
        } catch (error) {
          console.error("Transcription error:", error);
          alert("Failed to transcribe audio.");
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access was denied or not available.");
    }
  };

  return (
    <div className="flex flex-col w-full relative">
    <form 
      onSubmit={handleSubmit}
      className="relative flex items-center w-full gap-3"
    >
      <div className={`
        flex-1 flex items-center bg-surface border rounded-sm transition-all duration-300
        ${isFocused ? "border-primary shadow-sm" : "border-border hover:border-border-strong"}
      `}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter description"
          className="flex-1 py-3 px-4 bg-transparent outline-none text-text placeholder:text-text-muted text-[15px]"
          aria-label="Search occupations"
        />

        <div className="flex items-center pr-2 gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-2 text-text-muted hover:text-text"
            >
              <span className="text-[18px] leading-none">&times;</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggleMic}
            className={`
              relative p-2 rounded-full transition-colors flex items-center justify-center border
              ${isListening ? "text-primary border-primary bg-primary-soft/10" : "text-text-muted border-border hover:bg-bg-subtle hover:text-text"}
            `}
            aria-label={isListening ? "Stop listening" : "Start voice search"}
            aria-live="polite"
          >
            {isListening ? (
              <Square className="w-4 h-4 fill-current relative z-10" />
            ) : (
              <Mic className="w-4 h-4 relative z-10" />
            )}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 bg-primary-soft/20 rounded-full"
                />
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="bg-primary text-white px-8 py-3 rounded-sm font-semibold text-[15px] transition-all disabled:opacity-50 disabled:pointer-events-none hover:bg-primary-soft shrink-0 h-full min-h-[46px]"
      >
        {loading ? "..." : "Search"}
      </button>
    </form>
    <AnimatePresence>
      {isTranscribing && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-primary font-medium flex items-center gap-1.5 mt-2 pl-2 overflow-hidden"
        >
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Transcribing audio, please wait...</span>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
