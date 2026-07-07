/**
 * Phase 2 — Hardcoded mock data for simulating a completed search experience.
 * No API calls. This file is the single source of truth for all demo data.
 */

export interface MockResult {
  nco_code: string;
  title: string;
  description: string;
  score: number;
  confidence: number;
  reason: string | null;
  display_title: string | null;
  summary: string | null;
  division_code: string | null;
  division_name: string | null;
  group_name: string | null;
  family_name: string | null;
  hierarchy_path: string | null;
}

export interface MockNormalization {
  original: string;
  normalized: string;
  detected_language: string;
  detected_script: string;
  method: string;
  applied_steps: string[];
}

export interface MockSearchResponse {
  query: string;
  count: number;
  results: MockResult[];
  reranked: boolean;
  search_log_id: number;
  low_confidence: boolean;
  fallback_suggestions: string[];
  normalization: MockNormalization;
}

// ---- Mock search response for "kisan" ----
export const MOCK_SEARCH: MockSearchResponse = {
  query: "kisan",
  count: 6,
  reranked: true,
  search_log_id: 42,
  low_confidence: false,
  fallback_suggestions: [],
  normalization: {
    original: "kisan",
    normalized: "farmer agricultural cultivator",
    detected_language: "Hinglish",
    detected_script: "Latin",
    method: "LLM",
    applied_steps: [
      "transliteration",
      "language detection → Hinglish",
      "LLM expansion → farmer agricultural cultivator",
    ],
  },
  results: [
    {
      nco_code: "6111",
      title: "Field Crop and Vegetable Growers",
      description:
        "Field crop and vegetable growers plan, organize and perform farming operations to grow and harvest field crops such as wheat, rice, sugar cane, ground nuts, tobacco, jute, hemp and cotton, and to grow and harvest vegetables and other garden crops for sale or delivery on a regular basis to wholesale buyers, marketing organizations or at markets.",
      score: 0.91,
      confidence: 92.5,
      reason:
        "Directly matches the concept of 'kisan' (farmer) — this occupation covers all field crop cultivation and vegetable growing activities typical of Indian farmers.",
      display_title: "Field Crop & Vegetable Growers",
      summary:
        "Farmers who grow field crops like wheat, rice, and vegetables for commercial purposes.",
      division_code: "6",
      division_name: "Skilled Agricultural, Forestry and Fishery Workers",
      group_name: "Market-oriented Skilled Agricultural Workers",
      family_name: "Field Crop and Vegetable Growers",
      hierarchy_path:
        "Skilled Agricultural Workers > Market-oriented > Field Crop and Vegetable Growers",
    },
    {
      nco_code: "6112",
      title: "Tree and Shrub Crop Growers",
      description:
        "Tree and shrub crop growers plan, organize and perform farming operations to grow and harvest trees and shrubs, and to collect their produce. They grow crops such as coffee, tea, cocoa, rubber, coconut, oil-palms, spices, fruits and nuts.",
      score: 0.82,
      confidence: 78.3,
      reason:
        "Related to farming but specifically covers tree/shrub crops like tea, coffee, and fruit orchards rather than field crops.",
      display_title: "Tree & Shrub Crop Growers",
      summary:
        "Farmers specializing in tree and shrub crops like tea, coffee, coconut, and fruits.",
      division_code: "6",
      division_name: "Skilled Agricultural, Forestry and Fishery Workers",
      group_name: "Market-oriented Skilled Agricultural Workers",
      family_name: "Tree and Shrub Crop Growers",
      hierarchy_path:
        "Skilled Agricultural Workers > Market-oriented > Tree and Shrub Crop Growers",
    },
    {
      nco_code: "6114",
      title: "Mixed Crop Growers",
      description:
        "Mixed crop growers plan, organize and perform farming operations to grow and harvest a combination of field crops, tree crops, vegetables and other crops, where none is a dominant speciality.",
      score: 0.77,
      confidence: 68.1,
      reason:
        "Covers mixed farming where no single crop dominates — applicable to smallholder Indian farmers with diverse cultivation.",
      display_title: "Mixed Crop Growers",
      summary:
        "Farmers practicing mixed agriculture with no single crop specialization.",
      division_code: "6",
      division_name: "Skilled Agricultural, Forestry and Fishery Workers",
      group_name: "Market-oriented Skilled Agricultural Workers",
      family_name: "Mixed Crop Growers",
      hierarchy_path:
        "Skilled Agricultural Workers > Market-oriented > Mixed Crop Growers",
    },
    {
      nco_code: "6121",
      title: "Livestock and Dairy Producers",
      description:
        "Livestock and dairy producers breed, raise and tend livestock and produce milk or other dairy products for sale or delivery on a regular basis to wholesale buyers.",
      score: 0.65,
      confidence: 52.4,
      reason:
        "Many Indian farmers ('kisan') also engage in animal husbandry alongside crop farming — this covers the livestock side.",
      display_title: "Livestock & Dairy Producers",
      summary:
        "Farmers who breed, raise livestock and produce milk and dairy products.",
      division_code: "6",
      division_name: "Skilled Agricultural, Forestry and Fishery Workers",
      group_name: "Market-oriented Skilled Agricultural Workers",
      family_name: "Livestock and Dairy Producers",
      hierarchy_path:
        "Skilled Agricultural Workers > Market-oriented > Livestock and Dairy Producers",
    },
    {
      nco_code: "9211",
      title: "Crop Farm Labourers",
      description:
        "Crop farm labourers perform simple and routine tasks in the production of crops including fruit and vegetables.",
      score: 0.58,
      confidence: 41.7,
      reason:
        "Farm labourers who assist in crop production — different from farm owners/operators as they work under supervision.",
      display_title: "Crop Farm Labourers",
      summary: "Manual labourers performing routine crop farming tasks.",
      division_code: "9",
      division_name: "Elementary Occupations",
      group_name: "Agricultural, Forestry and Fishery Labourers",
      family_name: "Crop Farm Labourers",
      hierarchy_path:
        "Elementary Occupations > Agricultural Labourers > Crop Farm Labourers",
    },
    {
      nco_code: "6113",
      title: "Gardeners, Horticultural and Nursery Growers",
      description:
        "Gardeners, horticultural and nursery growers plan, organize and perform operations to cultivate and maintain trees, shrubs, flowers and other plants in parks, gardens, nurseries and other establishments.",
      score: 0.52,
      confidence: 35.2,
      reason:
        "Horticultural work overlaps with farming but focuses on ornamental plants, parks and nurseries rather than staple crops.",
      display_title: "Gardeners & Nursery Growers",
      summary:
        "Workers cultivating plants in parks, gardens, and nurseries.",
      division_code: "6",
      division_name: "Skilled Agricultural, Forestry and Fishery Workers",
      group_name: "Market-oriented Skilled Agricultural Workers",
      family_name: "Gardeners, Horticultural and Nursery Growers",
      hierarchy_path:
        "Skilled Agricultural Workers > Market-oriented > Gardeners and Nursery Growers",
    },
  ],
};

// ---- Low-confidence mock for fallback demo ----
export const MOCK_SEARCH_LOW_CONFIDENCE: MockSearchResponse = {
  query: "chakka repair wala",
  count: 3,
  reranked: true,
  search_log_id: 87,
  low_confidence: true,
  fallback_suggestions: [
    "tyre repair mechanic",
    "wheel alignment technician",
    "automobile repair worker",
  ],
  normalization: {
    original: "chakka repair wala",
    normalized: "wheel repair worker mechanic",
    detected_language: "Hinglish",
    detected_script: "Latin",
    method: "LLM",
    applied_steps: [
      "language detection → Hinglish",
      "LLM translation → wheel repair worker mechanic",
    ],
  },
  results: [
    {
      nco_code: "7231",
      title: "Motor Vehicle Mechanics and Repairers",
      description:
        "Motor vehicle mechanics and repairers fit, install, maintain and repair engines, and the mechanical and related equipment of motorcycles, motor cars, trucks, buses, and other motor vehicles.",
      score: 0.43,
      confidence: 38.5,
      reason:
        "Closest match but covers general motor vehicle repair — 'chakka' (wheel) repair is a subset.",
      display_title: "Motor Vehicle Mechanics & Repairers",
      summary: "Mechanics who repair engines and equipment of motor vehicles.",
      division_code: "7",
      division_name: "Craft and Related Trades Workers",
      group_name: "Metal, Machinery and Related Trades Workers",
      family_name: "Motor Vehicle Mechanics and Repairers",
      hierarchy_path:
        "Craft Workers > Metal and Machinery > Motor Vehicle Mechanics",
    },
    {
      nco_code: "7233",
      title: "Agricultural and Industrial Machinery Mechanics and Repairers",
      description:
        "Agricultural and industrial machinery mechanics and repairers fit, install, inspect, service and repair engines, agricultural and industrial machinery and mechanical equipment.",
      score: 0.35,
      confidence: 29.8,
      reason: "Covers agricultural machinery repair but not specific to wheel/tyre work.",
      display_title: "Machinery Mechanics & Repairers",
      summary: "Mechanics servicing agricultural and industrial machinery.",
      division_code: "7",
      division_name: "Craft and Related Trades Workers",
      group_name: "Metal, Machinery and Related Trades Workers",
      family_name: "Agricultural Machinery Mechanics",
      hierarchy_path:
        "Craft Workers > Metal and Machinery > Agricultural Machinery Mechanics",
    },
    {
      nco_code: "7234",
      title: "Bicycle and Related Repairers",
      description:
        "Bicycle and related repairers adjust, service and repair bicycles, cycle rickshaws, hand carts and similar non-motorized vehicles.",
      score: 0.28,
      confidence: 22.1,
      reason: "Covers non-motorized wheel-based vehicle repair — may apply if 'chakka' refers to bicycle wheels.",
      display_title: "Bicycle & Related Repairers",
      summary: "Workers who repair bicycles, rickshaws, and hand carts.",
      division_code: "7",
      division_name: "Craft and Related Trades Workers",
      group_name: "Metal, Machinery and Related Trades Workers",
      family_name: "Bicycle and Related Repairers",
      hierarchy_path:
        "Craft Workers > Metal and Machinery > Bicycle Repairers",
    },
  ],
};

// ---- Search history mock ----
export const MOCK_HISTORY = [
  "kisan",
  "software developer",
  "tractor driver",
  "tailor",
  "teacher",
];
