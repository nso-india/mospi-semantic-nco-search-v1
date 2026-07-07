import { create } from "zustand";
import { persist } from "zustand/middleware";
import { searchOccupations, assignCode, submitFeedback } from "../lib/api";

export interface BatchItem {
  id: string;
  originalText: string;
  refId?: string;
  status: "queued" | "coding" | "coded" | "error" | "skipped";
  code?: string;
  title?: string;
  confidence?: number;
  searchLogId?: number | null;
  feedback?: boolean | null; // true = positive, false = negative, null = none
  errorMsg?: string;
  rawRow?: any; // Stores the entire original CSV row for lossless export
}

interface BatchJobState {
  // Config / Input
  fileName: string | null;
  parsedHeaders: string[] | null;
  parsedData: any[] | null;
  columnMappings: { titleColumn: string; idColumn?: string };
  duplicatesCount: number;
  
  // Job execution state
  items: BatchItem[];
  status: "idle" | "processing" | "paused" | "completed";
  processedCount: number;
  successCount: number;
  errorCount: number;
  eta: number | null; // in seconds
  
  // Timing
  startTime: number | null;
  totalActiveTime: number; // in ms
  lastActiveTimestamp: number | null;

  // Actions
  setInputData: (params: {
    fileName: string | null;
    headers: string[] | null;
    data: any[] | null;
    columnMappings: { titleColumn: string; idColumn?: string };
    duplicatesCount: number;
    items: BatchItem[];
  }) => void;
  resetJob: () => void;
  setStatus: (status: "idle" | "processing" | "paused" | "completed") => void;
  updateRowStatus: (id: string, updates: Partial<BatchItem>) => void;
  updateStats: () => void;
  updateETA: () => void;
  overrideRowCode: (id: string, code: string, title: string, confidence: number) => Promise<void>;
  submitRowFeedback: (id: string, positive: boolean) => Promise<void>;
}

export const useBatchJob = create<BatchJobState>()(
  persist(
    (set, get) => ({
      fileName: null,
      parsedHeaders: null,
      parsedData: null,
      columnMappings: { titleColumn: "" },
      duplicatesCount: 0,
      
      items: [],
      status: "idle",
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      eta: null,
      
      startTime: null,
      totalActiveTime: 0,
      lastActiveTimestamp: null,

      setInputData: (params) => {
        set({
          fileName: params.fileName,
          parsedHeaders: params.headers,
          parsedData: params.data,
          columnMappings: params.columnMappings,
          duplicatesCount: params.duplicatesCount,
          items: params.items,
          status: "idle",
          processedCount: 0,
          successCount: 0,
          errorCount: 0,
          eta: null,
          startTime: null,
          totalActiveTime: 0,
          lastActiveTimestamp: null,
        });
      },

      resetJob: () => {
        set({
          fileName: null,
          parsedHeaders: null,
          parsedData: null,
          columnMappings: { titleColumn: "" },
          duplicatesCount: 0,
          items: [],
          status: "idle",
          processedCount: 0,
          successCount: 0,
          errorCount: 0,
          eta: null,
          startTime: null,
          totalActiveTime: 0,
          lastActiveTimestamp: null,
        });
      },

      setStatus: (status) => {
        const now = Date.now();
        set((state) => {
          let startTime = state.startTime;
          let lastActiveTimestamp = state.lastActiveTimestamp;
          let totalActiveTime = state.totalActiveTime;

          if (status === "processing") {
            if (!startTime) startTime = now;
            lastActiveTimestamp = now;
          } else if (status === "paused" || status === "completed") {
            if (lastActiveTimestamp) {
              totalActiveTime += now - lastActiveTimestamp;
            }
            lastActiveTimestamp = null;
          }

          return {
            status,
            startTime,
            lastActiveTimestamp,
            totalActiveTime,
          };
        });
        get().updateStats();
      },

      updateRowStatus: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
        get().updateStats();
        get().updateETA();
      },

      updateStats: () => {
        set((state) => {
          const processed = state.items.filter((i) => i.status === "coded" || i.status === "error");
          const success = state.items.filter((i) => i.status === "coded");
          const error = state.items.filter((i) => i.status === "error");

          return {
            processedCount: processed.length,
            successCount: success.length,
            errorCount: error.length,
          };
        });
      },

      updateETA: () => {
        set((state) => {
          const total = state.items.length;
          const remaining = total - state.processedCount;
          if (remaining <= 0) return { eta: 0 };

          const now = Date.now();
          let currentActiveTime = state.totalActiveTime;
          if (state.status === "processing" && state.lastActiveTimestamp) {
            currentActiveTime += now - state.lastActiveTimestamp;
          }

          if (state.processedCount === 0 || currentActiveTime === 0) {
            return { eta: null }; // Can't calculate yet
          }

          // Rolling average speed (ms per item)
          const msPerItem = currentActiveTime / state.processedCount;
          const etaSeconds = Math.ceil((remaining * msPerItem) / 1000);

          return { eta: etaSeconds };
        });
      },

      overrideRowCode: async (id, code, title, confidence) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        // Optimistically set to coded status
        get().updateRowStatus(id, {
          status: "coded",
          code,
          title,
          confidence,
          errorMsg: undefined,
        });

        try {
          const res = await assignCode({
            search_log_id: item.searchLogId || null,
            original_query: item.originalText,
            assigned_nco_code: code,
            assigned_title: title,
            suggested_nco_code: item.code || null,
          });
          // Update row with final details from assign response if needed
        } catch (err: any) {
          console.error("Failed to manually assign code in batch row", err);
          // Don't revert to error state completely unless we want to force it.
          // Keep the change but maybe note that assignment API sync failed.
        }
      },

      submitRowFeedback: async (id, positive) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || !item.code) return;

        // Optimistic feedback update
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, feedback: positive } : i
          ),
        }));

        try {
          await submitFeedback({
            search_log_id: item.searchLogId || null,
            nco_code: item.code,
            query: item.originalText,
            positive,
          });
        } catch (err) {
          console.error("Failed to submit feedback for batch row", err);
        }
      },
    }),
    {
      name: "sw_batch_job",
      // Only persist configuration, items state, and statistics.
      partialize: (state) => ({
        fileName: state.fileName,
        parsedHeaders: state.parsedHeaders,
        columnMappings: state.columnMappings,
        duplicatesCount: state.duplicatesCount,
        items: state.items,
        status: state.status === "processing" ? "paused" : state.status, // resume paused on reload
        processedCount: state.processedCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        totalActiveTime: state.totalActiveTime,
      }),
    }
  )
);
