import type { SearchResponse, SearchResult } from "./types";

const BASE = "/api";

export async function searchOccupations(
  query: string,
  topK = 8,
  responseLanguage?: string,
  llmMode: "online" | "offline" = "online"
): Promise<SearchResponse> {
  const body: Record<string, unknown> = { query, top_k: topK, llm_mode: llmMode };
  if (responseLanguage && responseLanguage !== "auto") {
    body.response_language = responseLanguage;
  }
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Search failed (${res.status}). Is the backend running on ${BASE}?`);
  }
  return res.json();
}

export interface BatchSearchItemResponse {
  query: string;
  nco_code?: string;
  title?: string;
  confidence?: number;
  error?: string;
}

export async function searchOccupationsBatch(
  queries: string[],
  topK = 1,
  llmMode: "online" | "offline" = "online"
): Promise<{ results: BatchSearchItemResponse[] }> {
  const body = { queries, top_k: topK, llm_mode: llmMode };
  const res = await fetch(`${BASE}/search/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Batch search failed (${res.status}).`);
  }
  return res.json();
}

export async function transcribeAudio(blob: Blob): Promise<{ text: string }> {
  const fd = new FormData();
  fd.append("file", blob, "audio.webm");
  const res = await fetch(`${BASE}/transcribe`, { method: "POST", body: fd });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.detail || "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Transcription failed (${res.status}).`);
  }
  return res.json();
}

// ── Feature 2: Assign code + Feedback ───────────────────────────────────

export async function preloadOfflineModel(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/preload`, { method: "POST" });
  if (!res.ok) throw new Error(`Preload failed (${res.status}).`);
  return res.json();
}

export async function assignCode(body: {
  search_log_id?: number | null;
  original_query: string;
  assigned_nco_code: string;
  assigned_title?: string | null;
  suggested_nco_code?: string | null;
}): Promise<{ id: number; overridden: boolean }> {
  const res = await fetch(`${BASE}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Assign failed (${res.status}).`);
  return res.json();
}

export async function submitFeedback(body: {
  search_log_id?: number | null;
  nco_code: string;
  query: string;
  positive: boolean;
}): Promise<{ id: number }> {
  const res = await fetch(`${BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Feedback failed (${res.status}).`);
  return res.json();
}

// Strip trailing truncation junk from dataset labels: ", and" / " and" / commas.
export function cleanLabel(s?: string | null): string {
  if (!s) return "";
  let t = s.trim();
  t = t.replace(/[,;]\s*$/g, "").replace(/\s+and\s*$/i, "").replace(/[,;]\s*$/g, "");
  return t.trim();
}

// The dataset sometimes puts an NSQF "Qualification Pack" label in `title`
// and the real role in `description`. Derive a sensible display headline.
export function displayTitle(r: SearchResult): string {
  // Prefer the LLM-cleaned title when the result was reranked.
  if (r.display_title && r.display_title.trim()) return cleanLabel(r.display_title);
  const title = cleanLabel(r.title);
  const looksLikeQpLabel =
    !title ||
    /qualification pack|terminal equipment|^application$/i.test(title);
  if (looksLikeQpLabel) {
    const lead = roleFromDescription(r.description);
    if (lead) return lead;
  }
  return title || roleFromDescription(r.description) || r.nco_code;
}

function roleFromDescription(desc: string): string {
  if (!desc) return "";
  // Take the first clause, trim at " is responsible/ is a", cap length.
  let lead = desc.split(/[;.]/)[0].trim();
  lead = lead.split(/\bis responsible\b|\bis a\b|\bare responsible\b/i)[0].trim();
  if (lead.length > 70) lead = lead.slice(0, 70).trim() + "…";
  return lead;
}

export function snippet(desc: string, n = 220): string {
  if (!desc) return "";
  const clean = desc.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n).trim() + "…" : clean;
}