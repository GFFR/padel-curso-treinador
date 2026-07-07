# Ingestion pipeline

Admin/developer-run pipeline: course PDFs → theme-tagged chunks → AI candidate
questions → validated inserts into the question bank (docs/ingestion-pipeline.md).

## Usage

```bash
cd app

# Extraction only — no keys needed; writes chunks to .ingestion-out/ for inspection
npm run ingest -- --theme ED --dry-run

# Full run — needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm run ingest -- --theme ED
npm run ingest -- --theme DA --scope presentations_only
```

Themes: `PDD`, `TMTD`, `FCH`, `FCH_DOPING`, `ED`, `DA`. Start with `ED` or `DA` (small).

## Files

- `material-map.ts` — file → theme mapping and the FCH/antidoping manual split
  (keyword-density classifier, calibrated on the real PDF).
- `extract.ts` — per-page PDF text via unpdf; presentations chunk per slide,
  manuals per 3 pages.
- `generate.ts` — Anthropic structured outputs (`messages.parse` + Zod schema),
  model `claude-opus-4-8`, prompt `v1`. Manual corpus is a cached prompt prefix.
- `db.ts` — service-role inserts: materials, chunks, batches, questions, options;
  duplicate detection by normalized prompt; quality flags → status mapping.
- `run-ingestion.ts` — CLI orchestrator.

The candidate Zod schema lives in `src/lib/ingestion/candidate-schema.ts` (shared
with the app for future admin review UI).
