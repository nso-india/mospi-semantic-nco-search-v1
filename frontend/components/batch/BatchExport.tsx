"use client";

import React, { useState, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download, Search, AlertCircle, FileSpreadsheet, RotateCcw, Check, Sparkles } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { BatchItem } from "../../store/useBatchJob";

interface BatchExportProps {
  items: BatchItem[];
  duplicatesCount: number;
  fileName: string | null;
  onReset: () => void;
  onRetryAllErrors: () => void;
  onRetryLowConfidence: () => void;
}

export default function BatchExport({
  items,
  duplicatesCount,
  fileName,
  onReset,
  onRetryAllErrors,
  onRetryLowConfidence,
}: BatchExportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "coded" | "low" | "error">("all");
  const [sortBy, setSortBy] = useState<"confidence_desc" | "confidence_asc" | "title">("confidence_desc");

  // Calculations for summary cards
  const stats = useMemo(() => {
    const total = items.length;
    const coded = items.filter((i) => i.status === "coded").length;
    const errors = items.filter((i) => i.status === "error").length;
    const lowConfidence = items.filter(
      (i) => i.status === "coded" && i.confidence !== undefined && i.confidence < 70
    ).length;

    // Average confidence of coded rows
    const codedWithConfidence = items.filter((i) => i.status === "coded" && i.confidence !== undefined);
    const avgConfidence =
      codedWithConfidence.length > 0
        ? Math.round(
            codedWithConfidence.reduce((acc, curr) => acc + (curr.confidence || 0), 0) /
              codedWithConfidence.length
          )
        : 0;

    return { total, coded, errors, lowConfidence, avgConfidence };
  }, [items]);

  // Filter and Sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.originalText.toLowerCase().includes(term) ||
          (i.title && i.title.toLowerCase().includes(term)) ||
          (i.code && i.code.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter === "coded") {
      result = result.filter((i) => i.status === "coded");
    } else if (statusFilter === "low") {
      result = result.filter((i) => i.status === "coded" && i.confidence !== undefined && i.confidence < 70);
    } else if (statusFilter === "error") {
      result = result.filter((i) => i.status === "error");
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "confidence_desc") {
        return (b.confidence || 0) - (a.confidence || 0);
      }
      if (sortBy === "confidence_asc") {
        return (a.confidence || 0) - (b.confidence || 0);
      }
      if (sortBy === "title") {
        return a.originalText.localeCompare(b.originalText);
      }
      return 0;
    });

    return result;
  }, [items, searchTerm, statusFilter, sortBy]);

  // Export handlers
  const getExportData = () => {
    return items.map((i) => {
      const baseExport = {
        "Reference ID": i.refId || "",
        "Input Title": i.originalText,
        "Assigned NCO Code": i.code || "",
        "Occupation Title": i.title || "",
        "Match Confidence (%)": i.confidence !== undefined ? i.confidence : "",
        "Status": i.status.toUpperCase(),
        "Error Message": i.errorMsg || "",
      };

      if (i.rawRow) {
        // Place raw columns first, AI outputs appended
        return { ...i.rawRow, ...baseExport };
      }
      return baseExport;
    });
  };

  const handleExportCSV = () => {
    const data = getExportData();
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.setAttribute("href", url);
    link.setAttribute("download", `skillweave-batch-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coded Results");
    
    // Auto-adjust column widths
    const maxLens = data.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const val = String(row[key as keyof typeof row] || "");
        acc[key] = Math.max(acc[key] || key.length, val.length);
      });
      return acc;
    }, {} as Record<string, number>);
    ws["!cols"] = Object.keys(maxLens).map((key) => ({ wch: maxLens[key] + 3 }));

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `skillweave-batch-${dateStr}.xlsx`);
  };

  return (
    <div className="w-full max-w-[880px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Completed Job</span>
          <h2 className="text-2xl font-bold text-text mt-1">Batch Code Summary</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            File: <span className="font-semibold text-text">{fileName || "Pasted List"}</span> 
            {duplicatesCount > 0 && ` (${duplicatesCount} duplicates merged)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={onReset} variant="ghost" className="h-10">
            <RotateCcw className="w-4 h-4 mr-2" />
            Code New Batch
          </Button>
          <div className="flex rounded-btn border border-border overflow-hidden bg-surface shadow-sm">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle flex items-center border-r border-border transition-all"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text hover:bg-bg-subtle flex items-center transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Total Coded</span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-text">{stats.coded}</span>
            <span className="text-xs text-text-muted">/ {stats.total}</span>
          </div>
          <span className="text-xxs text-text-secondary mt-2 block">Successful matches</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Avg Confidence</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-gradient">{stats.avgConfidence}%</span>
          </div>
          <span className="text-xxs text-text-secondary mt-2 block">Mean match score</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Low Confidence</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-extrabold ${stats.lowConfidence > 0 ? "text-amber-500" : "text-text"}`}>
              {stats.lowConfidence}
            </span>
          </div>
          <span className="text-xxs text-text-secondary mt-2 block">Confidence &lt; 70%</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Errors</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-extrabold ${stats.errors > 0 ? "text-danger" : "text-text"}`}>
              {stats.errors}
            </span>
          </div>
          <span className="text-xxs text-text-secondary mt-2 block">Failed assignments</span>
        </Card>
      </div>

      {/* Troubleshoot/Bulk Banners */}
      {(stats.errors > 0 || stats.lowConfidence > 0) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-btn border bg-amber-500/5 border-amber-500/25 text-amber-600 dark:text-amber-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold leading-relaxed">
              We flagged {stats.errors} error(s) and {stats.lowConfidence} low-confidence mapping(s) in this batch.
            </span>
          </div>
          <div className="flex gap-2">
            {stats.errors > 0 && (
              <Button onClick={onRetryAllErrors} variant="pill" className="h-8 text-xxs font-bold border-amber-500/35 hover:border-amber-500">
                Retry All Errors
              </Button>
            )}
            {stats.lowConfidence > 0 && (
              <Button onClick={onRetryLowConfidence} variant="pill" className="h-8 text-xxs font-bold border-amber-500/35 hover:border-amber-500">
                Retry Low Confidence
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Sorting Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface border border-border rounded-card p-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search coded results..."
            className="w-full pl-9 pr-4 py-2 rounded-btn border border-border bg-bg-subtle text-text placeholder-text-muted text-xs focus:outline-none focus:ring-4 focus:ring-focus-ring focus:border-primary-soft transition-all"
          />
        </div>

        {/* Filter / Sort Row */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Segment */}
          <div className="flex items-center rounded-btn border border-border overflow-hidden bg-bg-subtle text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 font-semibold transition-all ${
                statusFilter === "all" ? "bg-surface text-text font-bold shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter("coded")}
              className={`px-3 py-1.5 font-semibold transition-all ${
                statusFilter === "coded" ? "bg-surface text-text font-bold shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              Coded ({stats.coded})
            </button>
            <button
              onClick={() => setStatusFilter("low")}
              className={`px-3 py-1.5 font-semibold transition-all ${
                statusFilter === "low" ? "bg-surface text-text font-bold shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              Low Conf ({stats.lowConfidence})
            </button>
            <button
              onClick={() => setStatusFilter("error")}
              className={`px-3 py-1.5 font-semibold transition-all ${
                statusFilter === "error" ? "bg-surface text-text font-bold shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              Errors ({stats.errors})
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-btn border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary font-semibold focus:outline-none transition-all"
          >
            <option value="confidence_desc">Highest Confidence</option>
            <option value="confidence_asc">Lowest Confidence</option>
            <option value="title">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="overflow-hidden border border-border rounded-card bg-surface shadow-card">
        <div className="px-6 py-4 border-b border-border bg-bg-subtle flex items-center justify-between">
          <h3 className="font-bold text-text text-sm">Coded Result Details</h3>
          <span className="text-xs text-text-muted font-semibold">Showing {filteredAndSortedItems.length} rows</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-bg-subtle text-text-secondary uppercase tracking-wider font-semibold sticky top-0 z-10 text-xs">
              <tr>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Input</th>
                <th className="px-5 py-3">NCO Code</th>
                <th className="px-5 py-3">Matched Title</th>
                <th className="px-5 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-secondary bg-surface">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-text-muted">
                    No results match your search filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const isLowConf = item.status === "coded" && item.confidence !== undefined && item.confidence < 70;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-bg-subtle/30 transition-colors ${
                        isLowConf ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {item.status === "coded" ? (
                          <span className="inline-flex items-center gap-1 text-success font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Coded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-danger font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-text max-w-[150px] truncate">
                        {item.originalText}
                        {item.refId && <span className="block text-xxs text-text-muted mt-0.5">ID: {item.refId}</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">{item.code || "—"}</td>
                      <td className="px-5 py-3.5 max-w-[200px] truncate">
                        {item.title || <span className="text-danger text-xs">{item.errorMsg || "—"}</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {item.status === "coded" && item.confidence !== undefined ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-signature-gradient text-white text-xxs font-extrabold">
                            {item.confidence}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
