"use client";

import React, { useState } from "react";
import { ArrowLeft, Play, Info, HelpCircle } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface ColumnMapperProps {
  fileName: string;
  headers: string[];
  data: any[];
  onBack: () => void;
  onConfirm: (params: {
    columnMappings: { titleColumn: string; idColumn?: string };
    duplicatesCount: number;
    items: { id: string; originalText: string; refId?: string; rawRow?: any }[];
  }) => void;
}

export default function ColumnMapper({
  fileName,
  headers,
  data,
  onBack,
  onConfirm,
}: ColumnMapperProps) {
  const [titleCol, setTitleCol] = useState(headers[0] || "");
  const [idCol, setIdCol] = useState("");
  const [deduplicate, setDeduplicate] = useState(true);

  // Take the first 5 rows for preview
  const previewRows = data.slice(0, 5);

  const handleStart = () => {
    // Generate normalized BatchItems from mapped columns
    const mapped = data
      .map((row, index) => {
        const text = String(row[titleCol] || "").trim();
        const refId = idCol ? String(row[idCol] || "").trim() : undefined;
        return {
          originalText: text,
          refId,
          rawRow: row,
        };
      })
      .filter((row) => row.originalText.length > 0);

    let finalRows = mapped;
    let duplicatesCount = 0;

    if (deduplicate) {
      // De-duplicate based on originalText (and refId if mapped)
      const seen = new Set<string>();
      finalRows = [];
      
      for (const row of mapped) {
        const key = `${row.originalText}::${row.refId || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          finalRows.push(row);
        } else {
          duplicatesCount++;
        }
      }
    }

    const items = finalRows.map((row, idx) => ({
      id: `file-${idx}-${Date.now()}`,
      originalText: row.originalText,
      refId: row.refId,
      status: "queued" as const,
      rawRow: row.rawRow,
    }));

    onConfirm({
      columnMappings: { titleColumn: titleCol, idColumn: idCol || undefined },
      duplicatesCount,
      items,
    });
  };

  return (
    <Card className="w-full max-w-[880px] mx-auto p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Step 2: Map Columns</span>
          <h2 className="text-xl font-bold text-text mt-1">Configure &amp; Preview File</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            File: <span className="font-semibold text-text">{fileName}</span> ({data.length} rows)
          </p>
        </div>
        <Button onClick={onBack} variant="ghost" className="self-start sm:self-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Change File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column selectors */}
        <div className="space-y-6">
          <div>
            <label htmlFor="title-col" className="block text-sm font-semibold text-text mb-2 flex items-center gap-1.5">
              Occupation Title Column
              <span className="text-rose-500">*</span>
            </label>
            <select
              id="title-col"
              value={titleCol}
              onChange={(e) => setTitleCol(e.target.value)}
              className="w-full rounded-btn border border-border bg-bg px-4 py-2.5 text-text focus:outline-none focus:ring-4 focus:ring-focus-ring focus:border-primary-soft transition-all"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1.5">
              Select the column containing the job titles or descriptions you want to match to NCO codes.
            </p>
          </div>

          <div>
            <label htmlFor="id-col" className="block text-sm font-semibold text-text mb-2">
              Reference ID Column (Optional)
            </label>
            <select
              id="id-col"
              value={idCol}
              onChange={(e) => setIdCol(e.target.value)}
              className="w-full rounded-btn border border-border bg-bg px-4 py-2.5 text-text focus:outline-none focus:ring-4 focus:ring-focus-ring focus:border-primary-soft transition-all"
            >
              <option value="">-- Do not map --</option>
              {headers
                .filter((h) => h !== titleCol)
                .map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
            </select>
            <p className="text-xs text-text-muted mt-1.5">
              An ID or reference identifier to map and carry over in the exported results.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="deduplicate"
              checked={deduplicate}
              onChange={(e) => setDeduplicate(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-bg"
            />
            <label htmlFor="deduplicate" className="text-sm font-medium text-text select-none cursor-pointer">
              Merge exact duplicate entries
            </label>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-bg-subtle border border-border rounded-card p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-semibold text-text flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Batch Execution Notes
            </h4>
            <ul className="text-xs text-text-secondary space-y-2 list-disc pl-4">
              <li>Batch processing runs locally at a rate-limit of 4 parallel requests to the server.</li>
              <li>For large files (e.g., &gt; 1,000 items), execution can take several minutes.</li>
              <li>You can pause, resume, or abort the run at any point.</li>
              <li>Completed results are cached in browser state, so progress isn&#39;t lost on reload.</li>
            </ul>
          </div>
          <div className="pt-6 border-t border-border/60 mt-4 md:mt-0 flex justify-end">
            <Button onClick={handleStart} variant="primary" className="w-full md:w-auto">
              <Play className="w-4 h-4 mr-2 fill-current" />
              Start Coding
            </Button>
          </div>
        </div>
      </div>

      {/* Preview table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
          First 5 Rows Preview
        </h3>
        <div className="overflow-x-auto border border-border rounded-btn bg-surface">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-bg-subtle text-text-secondary uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Row #</th>
                {headers.map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 ${
                      h === titleCol
                        ? "text-primary bg-primary/5 font-bold"
                        : h === idCol
                        ? "text-accent font-bold"
                        : ""
                    }`}
                  >
                    {h}
                    {h === titleCol && " (Title)"}
                    {h === idCol && " (ID)"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-secondary">
              {previewRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-text-muted">{idx + 1}</td>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={`px-4 py-3 max-w-[200px] truncate ${
                        h === titleCol ? "bg-primary/5 font-medium text-text" : ""
                      }`}
                    >
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
