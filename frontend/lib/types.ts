// Mirrors the FastAPI response models (app/schemas.py).

export interface SearchResult {
  nco_code: string;
  title: string;
  description: string;
  score: number;
  confidence: number;
  reason?: string | null;
  display_title?: string | null;
  summary?: string | null;
  division_code?: string | null;
  division_name?: string | null;
  group_name?: string | null;
  family_name?: string | null;
  hierarchy_path?: string | null;
}

export interface NormalizationInfo {
  original: string;
  normalized: string;
  detected_language: string;
  detected_script: string;
  method: string; // "rules" | "llm" | "passthrough" | "disabled"
  applied_steps: string[];
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
  normalization: NormalizationInfo;
  reranked?: boolean;
  search_log_id?: number | null;
  low_confidence?: boolean;
  fallback_suggestions?: string[] | null;
}