# 0009 — Option shuffling and linked source PDFs

**Status**: accepted (M7 operations, 2026-07-08)

## Option shuffling

Generated questions carry a strong position bias: measured on the live bank, **91% of
correct answers sat in option A** (269/294). Options are now shuffled **per attempt at
snapshot-assembly time** (`permuteOptions` in `src/lib/domain/options.ts`, applied in
`toSnapshot`):

- Fixes the existing bank with no backfill — the DB keeps the canonical generation order,
  only attempt snapshots are permuted.
- Repeats of a question land on different letters across attempts, so students can't
  memorize positions.
- Verified on a live 80-question assembly: correct answers spread 22/25/14/19 across A–D.
- Admin review screens still show canonical DB order.

## Linked source PDFs

Explanations now link "Estudo:" (and "Aula:" on the exam review) to the referenced PDF,
opened at the cited page via `#page=N`.

- **Private Supabase Storage bucket `materiais`** (user decision — the IPDJ manuals are
  copyrighted): links are short-lived signed URLs (3h TTL, covers an exam) generated
  server-side after the student session check (`src/lib/materials.ts`).
- Storage keys are **slugified** (`materialStorageKey`) because Supabase rejects accented
  characters in object keys; the same mapping is used at upload and link time.
- Practice reveals get the URL through the `answerQuestion` action response; the exam
  review signs one URL per unique file per page render.
- Upload is a one-off ops script (all 13 PDFs, 45MB bucket file limit — free-tier cap).

## M7 operational learnings

- Transient network failures happen mid-run: one material upsert died with an undefined
  error, one TMTD and two PDD generation calls died ("terminated" / truncated structured
  output). Failed batches leave a **coverage gap** — the affected slides produce no
  questions and nothing else covers them.
- Recovery is now first-class: `npm run ingest -- --theme X --anchors FROM..TO` re-runs
  exactly one batch's slides (batch N covers anchors (N-1)*6..N*6). All gaps were
  recovered; every batch of all six themes has coverage.
- Final bank: ~347 questions (PDD 138, TMTD 83, FCH_DOPING 37, DA 36, FCH 30, ED 12 —
  before review), statuses `unreviewed`/`weakly_sourced` + quality flags as designed.
- Full-exam assembly verified live: 80 questions, exact blueprint, no shortfalls.
