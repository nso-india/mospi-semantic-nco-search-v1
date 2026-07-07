"use client";

import React, { useEffect } from "react";
import { Layers } from "lucide-react";
import { useBatchJob } from "@/store/useBatchJob";
import { runBatchQueue } from "@/lib/batchQueue";

// Subcomponents
import BatchInput from "@/components/batch/BatchInput";
import ColumnMapper from "@/components/batch/ColumnMapper";
import BatchProgress from "@/components/batch/BatchProgress";
import BatchResultsTable from "@/components/batch/BatchResultsTable";
import BatchExport from "@/components/batch/BatchExport";

export default function BatchCoding() {
  const {
    fileName,
    parsedHeaders,
    parsedData,
    columnMappings,
    duplicatesCount,
    items,
    status,
    processedCount,
    successCount,
    errorCount,
    eta,
    setInputData,
    resetJob,
    setStatus,
    updateRowStatus,
    overrideRowCode,
    submitRowFeedback,
  } = useBatchJob();

  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Run queue runner whenever status changes to "processing"
  useEffect(() => {
    if (mounted && status === "processing") {
      runBatchQueue();
    }
  }, [status, mounted]);

  // Prevent state locks: if status is active/completed but there are no items, reset to idle/setup
  useEffect(() => {
    if (mounted && (status === "processing" || status === "paused" || status === "completed") && items.length === 0) {
      resetJob();
    }
  }, [status, items.length, mounted, resetJob]);

  // Auto-transition to processing if status is idle but items are populated (e.g. after paste or column mapping)
  useEffect(() => {
    if (mounted && status === "idle" && items.length > 0) {
      setStatus("processing");
    }
  }, [status, items.length, mounted, setStatus]);

  // Action handlers
  const handleDataParsed = (params: any) => {
    setInputData(params);
    if (params.fileName === "Pasted List") {
      setStatus("processing");
    }
  };

  const handleColumnConfigConfirm = (params: any) => {
    setInputData({
      fileName,
      headers: parsedHeaders,
      data: parsedData,
      columnMappings: params.columnMappings,
      duplicatesCount: params.duplicatesCount,
      items: params.items,
    });
    setStatus("processing");
  };

  const handlePause = () => {
    setStatus("paused");
  };

  const handleResume = () => {
    setStatus("processing");
  };

  const handleCancel = () => {
    resetJob();
  };

  const handleRetryRow = (id: string) => {
    updateRowStatus(id, { status: "queued", errorMsg: undefined });
    setStatus("processing");
  };

  const handleRetryAllErrors = () => {
    items.forEach((item) => {
      if (item.status === "error") {
        updateRowStatus(item.id, { status: "queued", errorMsg: undefined });
      }
    });
    setStatus("processing");
  };

  const handleRetryLowConfidence = () => {
    items.forEach((item) => {
      if (item.status === "coded" && item.confidence !== undefined && item.confidence < 70) {
        updateRowStatus(item.id, { status: "queued", errorMsg: undefined });
      }
    });
    setStatus("processing");
  };

  // State Routing
  const isSetupNeeded = !fileName || (fileName !== "Pasted List" && !parsedHeaders);
  const isColumnMappingNeeded = !!(fileName && parsedHeaders && items.length === 0 && status === "idle");
  const isRunningOrPaused = (status === "processing" || status === "paused") && items.length > 0;
  const isCompleted = status === "completed";

  console.log("DEBUG BATCH:", {
    fileName,
    parsedHeaders,
    status,
    itemsLength: items?.length,
    isSetupNeeded,
    isColumnMappingNeeded,
    isRunningOrPaused,
    isCompleted
  });

  if (!mounted) {
    return (
      <div className="w-full max-w-[880px] mx-auto pb-12 animate-pulse space-y-6">
        <div className="h-10 w-48 bg-border/50 rounded-btn mb-8"></div>
        <div className="h-64 bg-border/50 rounded-card"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[880px] mx-auto pb-12">
      {/* Page Title (hidden when processing to save space, but shown on home/completed) */}
      {(isSetupNeeded || isCompleted) && (
        <div className="mb-8 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-btn bg-signature-gradient flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Batch Coding</h1>
              <p className="text-text-secondary text-sm mt-0.5">
                Bulk-code entire datasets of occupation titles with AI semantic matching.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Input Step */}
      {isSetupNeeded && (
        <BatchInput onDataParsed={handleDataParsed} />
      )}

      {/* 2. Column Mapping Step */}
      {isColumnMappingNeeded && (
        <ColumnMapper
          fileName={fileName || ""}
          headers={parsedHeaders || []}
          data={parsedData || []}
          onBack={handleCancel}
          onConfirm={handleColumnConfigConfirm}
        />
      )}

      {/* 3. Live Processing Step */}
      {isRunningOrPaused && (
        <div className="space-y-6">
          <BatchProgress
            status={status}
            totalCount={items.length}
            processedCount={processedCount}
            successCount={successCount}
            errorCount={errorCount}
            eta={eta}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
          <BatchResultsTable
            items={items}
            onOverride={overrideRowCode}
            onFeedback={submitRowFeedback}
            onRetryRow={handleRetryRow}
          />
        </div>
      )}

      {/* 4. Complete / Export Step */}
      {isCompleted && (
        <BatchExport
          items={items}
          duplicatesCount={duplicatesCount}
          fileName={fileName}
          onReset={handleCancel}
          onRetryAllErrors={handleRetryAllErrors}
          onRetryLowConfidence={handleRetryLowConfidence}
        />
      )}
    </div>
  );
}
