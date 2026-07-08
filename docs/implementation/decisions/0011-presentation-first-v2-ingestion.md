# 0011 — Presentation-first v2 ingestion and bank sets

**Status**: accepted (2026-07-08)

## Bank sets (v1 / v2)

- New tables: `question_bank_sets`, `bank_set_activation`; `questions.bank_set_id` FK.
- Global default in `bank_set_activation` where `theme_id IS NULL`; optional per-theme override rows.
- Students see questions from the resolved active set per theme (`fetchBank` in `exam-service.ts`).
- Existing questions backfilled to **v1**; global default stays **v1** until admin changes it.
- Admin UI: `/admin/banco` — global toggle + per-theme override buttons.

## Ingestion v2 (prompt `v2`)

- **One topic anchor per AI call** (merged sparse slides via `mergeTopicAnchors`).
- Default quota: **4 questions/anchor** (ED/DA/FCH/FCH_DOPING), **3** for PDD/TMTD.
- **Presentation-first**: question answerable from slide alone; manual excerpts matched per anchor (`matchManualChunks`) for explanations only.
- Post-gen **grounding check** rejects candidates whose prompt lacks token overlap with anchor (`validateCandidateGrounding`).
- Dedupe scoped to `(theme, bank_set, anchor page)`.
- CLI: `--bank-set v2`, `--questions-per-anchor N`, `--anchor FROM..TO`, `--max-retries N`.

## Assembly

- `selectFromThemePool`: phase 1 spreads picks across distinct `anchorKey`s; phase 2 least-seen fill (ADR 0005 unchanged for cross-attempt repeats).

## Quality

- Unit tests: `scripts/ingestion/__tests__/`, extended `assembly.test.ts`, `bank-sets.test.ts`.
- Post-ingest: `npm run ingest:check -- --theme ED --bank-set v2`.

## Rollout

1. Migration `00004_question_bank_sets.sql` applied; v1 remains active globally.
2. Ingest v2 per theme; review in admin.
3. Set per-theme override (e.g. ED ? v2) or flip global when ready.
