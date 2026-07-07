import { useBatchJob, BatchItem } from "../store/useBatchJob";
import { searchOccupationsBatch, assignCode } from "./api";

let isRunning = false;

export async function runBatchQueue() {
  const initialState = useBatchJob.getState();
  console.log("DEBUG runBatchQueue ENTERED:", {
    isRunning,
    status: initialState.status,
    itemsLength: initialState.items?.length,
    queuedCount: initialState.items?.filter(i => i.status === "queued").length
  });

  if (isRunning) {
    console.log("DEBUG runBatchQueue ALREADY RUNNING - EXITING");
    return;
  }
  isRunning = true;

  const getNextQueuedItems = (limit: number) => {
    const { items, status } = useBatchJob.getState();
    if (status !== "processing") {
      return [];
    }
    return items.filter((item) => item.status === "queued").slice(0, limit);
  };

  const worker = async () => {
    while (true) {
      const chunk = getNextQueuedItems(50);
      if (chunk.length === 0) break;

      // Update state to coding
      chunk.forEach(item => {
        useBatchJob.getState().updateRowStatus(item.id, { status: "coding" });
      });

      try {
        // 1. Search batch
        const searchRes = await searchOccupationsBatch(chunk.map(c => c.originalText), 1);
        
        // 2. Process results
        for (let i = 0; i < chunk.length; i++) {
          const item = chunk[i];
          const res = searchRes.results[i];

          if (res && res.nco_code) {
            const code = res.nco_code;
            const title = res.title;
            const confidence = res.confidence;
            const searchLogId = null; // Batch logging could be implemented later

            // Try to assign
            try {
              await assignCode({
                search_log_id: searchLogId,
                original_query: item.originalText,
                assigned_nco_code: code,
                assigned_title: title,
                suggested_nco_code: code,
              });
            } catch (assignErr) {}

            useBatchJob.getState().updateRowStatus(item.id, {
              status: "coded",
              code,
              title,
              confidence,
              searchLogId,
              errorMsg: undefined,
            });
          } else {
            useBatchJob.getState().updateRowStatus(item.id, {
              status: "error",
              errorMsg: res?.error || "No matching occupations found",
            });
          }
        }
      } catch (err: any) {
        console.error(`Batch processing error:`, err);
        chunk.forEach(item => {
          useBatchJob.getState().updateRowStatus(item.id, {
            status: "error",
            errorMsg: err?.message || "Connection failed",
          });
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  const CONCURRENCY = 2;
  const workers = Array.from({ length: CONCURRENCY }, () => worker());

  try {
    await Promise.all(workers);
  } finally {
    isRunning = false;
    
    // Check if we are finished or paused
    const { items, status } = useBatchJob.getState();
    const hasMoreQueued = items.some((item) => item.status === "queued");
    const hasCoding = items.some((item) => item.status === "coding");
    
    console.log("DEBUG runBatchQueue FINALLY:", {
      status,
      itemsLength: items?.length,
      hasMoreQueued,
      hasCoding
    });

    if (status === "processing") {
      if (!hasMoreQueued && !hasCoding) {
        console.log("DEBUG runBatchQueue SETTING STATUS TO COMPLETED");
        useBatchJob.getState().setStatus("completed");
      }
    }
  }
}
