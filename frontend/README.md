# NCO Khoj — Frontend (Phase 3)

Next.js 14 (App Router) UI for the NCO 2015 semantic search backend. Multilingual
search box, result cards with NCO code + match strength, occupation hierarchy
breadcrumb, and a transformation trail that shows how each query was normalized.

## Prerequisites
- Node.js 18+ (`node -v` to check). Get it from https://nodejs.org if missing.
- The Phase 1/2 backend running at http://localhost:8000.

## Setup & run
```bash
cd frontend
copy .env.local.example .env.local        # Windows (use cp on macOS/Linux)
npm install
npm run dev
```
Open http://localhost:3000

> The backend already allows CORS from any origin (Phase 1), so the browser can
> call http://localhost:8000 directly. If you host the API elsewhere, set
> `NEXT_PUBLIC_API_BASE` in `.env.local`.

## Test (manual)
With both servers running, open http://localhost:3000 and try:

| Query | Expect |
|---|---|
| `kisan` | Trail shows `kisan → farmer`; farming occupation cards |
| `किसान` | Detected **Hindi / Devanagari**; same farming codes |
| `software banane wala` | Trail shows the phrase → `software developer`; dev codes |
| `machhli pakadne wala` | Trail → `fisherman`; fishery codes |
| `softwear enginer` | Trail shows typo fixes → `software engineer` |
| `person who grows crops` | No trail (plain English); crop-grower codes |

Checks:
- Each card shows a monospace **NCO code**, a title, a **Match** meter, and a
  hierarchy breadcrumb.
- "Read full description" expands long entries.
- The 🎙 mic button is present but disabled — it gets wired in **Phase 4**.

## Structure
```
frontend/
├── app/
│   ├── layout.tsx        # root layout + metadata
│   ├── page.tsx          # search page (state, fetch, layout)
│   └── globals.css       # design system
├── components/
│   ├── SearchBar.tsx
│   ├── NormalizationTrail.tsx   # the explainability "signature"
│   ├── ResultCard.tsx
│   └── ConfidenceMeter.tsx
└── lib/
    ├── api.ts            # fetch client + title/snippet helpers
    └── types.ts          # mirrors backend schemas
```
