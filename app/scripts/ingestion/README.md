# Ingestion pipeline

Admin/developer-run pipeline: course PDFs → theme-tagged chunks → AI candidate
questions → validated inserts into the question bank (docs/ingestion-pipeline.md).

## Usage

```bash
cd app

# Extraction only — no keys needed; writes chunks to .ingestion-out/ for inspection
npm run ingest -- --theme ED --dry-run

# Full v2 run — needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm run ingest -- --theme ED --bank-set v2
npm run ingest -- --theme ED --bank-set v2 --questions-per-anchor 4
npm run ingest -- --theme ED --scope presentations_only

# Recover one topic anchor slice (0-based, end-exclusive)
npm run ingest -- --theme ED --anchor 0..1

# Post-ingest quality report (anchor quota, duplicates, grounding)
npm run ingest:check -- --theme ED --bank-set v2 --questions-per-anchor 4
```

Themes: `PDD`, `TMTD`, `FCH`, `FCH_DOPING`, `ED`, `DA`. Start with `ED` or `DA` (small).

Default `--bank-set` is **v2** for new ingestion. Existing production questions are tagged **v1**; global activation stays v1 until changed in `/admin/banco`.

## Files

- `material-map.ts` — file → theme mapping and the FCH/antidoping manual split.
- `extract.ts` — per-page PDF text; `mergeTopicAnchors` merges sparse title slides.
- `match-manual.ts` — per-anchor manual excerpt selection (not full corpus).
- `generate.ts` — prompt **v2**, one anchor per call, `claude-opus-4-8`.
- `validate-candidate.ts` — anchor grounding check before insert.
- `db.ts` — service-role inserts; bank-set-scoped dedupe.
- `check-quality.ts` — post-ingest coverage report.
- `run-ingestion.ts` — CLI orchestrator.

The candidate Zod schema lives in `src/lib/ingestion/candidate-schema.ts`.

## ED pilot runbook

1. Apply migration `00004_question_bank_sets.sql` (via `npx supabase db push`).
2. `npm run ingest -- --theme ED --dry-run` — inspect `topicAnchors` count.
3. `npm run ingest -- --theme ED --bank-set v2` — inserts into v2 bank set.
4. `npm run ingest:check -- --theme ED --bank-set v2`.
5. Review in `/admin/perguntas`; set ED override to v2 in `/admin/banco` when satisfied.
