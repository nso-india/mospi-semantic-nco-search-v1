"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Clipboard, AlertCircle } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface BatchInputProps {
  onDataParsed: (params: {
    fileName: string | null;
    headers: string[] | null;
    data: any[] | null; // array of rows (objects or arrays)
    columnMappings: { titleColumn: string; idColumn?: string };
    duplicatesCount: number;
    items: { id: string; originalText: string; refId?: string }[];
  }) => void;
}

export default function BatchInput({ onDataParsed }: BatchInputProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab Styles
  const tabClass = (tab: "upload" | "paste") =>
    `flex-1 py-3 text-center text-sm font-semibold transition-all border-b-2 ${
      activeTab === tab
        ? "border-primary text-primary bg-primary/5"
        : "border-border text-text-secondary hover:text-text hover:bg-bg-subtle"
    }`;

  // File Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Process uploaded CSV/Excel
  const processFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV Parse warnings:", results.errors);
          }
          if (results.data && results.data.length > 0) {
            const headers = Object.keys(results.data[0] as object);
            onDataParsed({
              fileName: file.name,
              headers,
              data: results.data,
              columnMappings: { titleColumn: headers[0] }, // default mapping
              duplicatesCount: 0,
              items: [], // Will be created in column selection step
            });
          } else {
            setError("The CSV file seems to be empty.");
          }
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData && jsonData.length > 0) {
            const headers = Object.keys(jsonData[0] as object);
            onDataParsed({
              fileName: file.name,
              headers,
              data: jsonData,
              columnMappings: { titleColumn: headers[0] },
              duplicatesCount: 0,
              items: [],
            });
          } else {
            setError("The Excel file seems to be empty.");
          }
        } catch (err: any) {
          setError(`Failed to parse Excel: ${err.message || err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported file format. Please upload a CSV, XLSX, or XLS file.");
    }
  };

  // Process pasted plain text
  const handlePasteSubmit = () => {
    setError(null);
    const lines = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError("Please paste at least one occupation title.");
      return;
    }

    // Deduplicate
    const uniqueLines = Array.from(new Set(lines));
    const duplicatesCount = lines.length - uniqueLines.length;

    const items = uniqueLines.map((line, idx) => ({
      id: `paste-${idx}-${Date.now()}`,
      originalText: line,
      status: "queued" as const,
    }));

    onDataParsed({
      fileName: "Pasted List",
      headers: null,
      data: null,
      columnMappings: { titleColumn: "" },
      duplicatesCount,
      items,
    });
  };

  return (
    <Card className="w-full max-w-[880px] mx-auto overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setActiveTab("upload");
            setError(null);
          }}
          className={tabClass("upload")}
        >
          <span className="flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            Upload CSV / Excel
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("paste");
            setError(null);
          }}
          className={tabClass("paste")}
        >
          <span className="flex items-center justify-center gap-2">
            <Clipboard className="w-4 h-4" />
            Paste List
          </span>
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-btn bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === "upload" ? (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-card p-10 cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-border hover:border-primary-soft hover:bg-bg-subtle"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <div className="relative mb-6 text-text-muted flex items-center justify-center w-20 h-20 bg-bg rounded-full border border-border">
                <FileSpreadsheet className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-text mb-2">
                Drop your CSV or Excel file here
              </h3>
              <p className="text-sm text-text-muted text-center max-w-sm mb-6">
                Drag and drop your spreadsheet or click to browse. We support .csv, .xlsx, and .xls formats.
              </p>
              <Button type="button" variant="pill">
                Browse Files
              </Button>
            </div>
            <div className="mt-6 text-center text-xs text-text-muted">
              Note: The file is parsed locally in your browser. Your data is not uploaded to any third-party parser.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="paste-area" className="block text-sm font-semibold text-text mb-2">
                Occupation Titles (one per line)
              </label>
              <textarea
                id="paste-area"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='Describe the occupations... e.g.&#10;rice farmer&#10;high school teacher&#10;software developer&#10;delivery driver'
                rows={10}
                className="w-full rounded-btn border border-border bg-bg-subtle px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:ring-4 focus:ring-focus-ring focus:border-primary-soft resize-y font-sans transition-all"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">
                {pasteText ? `${pasteText.split("\n").filter((l) => l.trim()).length} rows input` : "0 rows input"}
              </span>
              <Button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                variant="primary"
                withArrow
              >
                Start Coding
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
