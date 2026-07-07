# 0003 — Database schema decisions beyond the brief

**Status**: accepted (M2, 2026-07-07)

The migrations follow the brief's suggested model. Points the brief left open were resolved
as follows:

1. **Practice sessions reuse `exam_attempts`** with `mode` (`'exam' | 'practice'`) and a
   `practice_theme_id` (required for practice, forbidden for exams). One flow then serves
   answering, feedback, reporting, and — importantly — repeat suppression counts questions
   seen in practice too. A separate practice table would have duplicated all three attempt
   tables for no gain at MVP size.
2. **Shared manual across themes**: `source_materials` is unique on `(theme_id, file_name)`,
   so `FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf` gets one row per theme (FCH and FCH_DOPING) and
   chunks are tagged per-theme underneath. This keeps question source references
   theme-consistent, matching `docs/course-material-map.md`.
3. **No `embedding` column yet.** The brief marks it optional; adding pgvector later is a
   single additive migration and the MVP retrieval is deterministic (theme-mapped chunks).
4. **`quality_flags` is `text[]`**, not a join table — flags are a small closed set consumed
   by the admin review list only.
5. **Profile creation is a DB trigger** on `auth.users` (insert + phone update), not app
   code. First OTP login always yields a profile even if the app crashes mid-login; the
   brief's "create or update on first login" is satisfied at the data layer.
6. **One answer per attempt-question** (`exam_attempt_answers.exam_attempt_question_id`
   unique): answers are upserted; changing an answer before submit updates the row.
7. **One feedback per (student, question)** — thumbs are toggled/updated, not accumulated.
8. **RLS posture**: students read reference data + the question bank minus `rejected` and
   `source_conflict` (ADR 0004 allows unreviewed; provenance doc requires conflict review);
   students own their attempts/answers/feedback/reports; chunks and generation batches are
   admin-only; ingestion and admin mutations run with the service role.
9. **Migrations are plain SQL** in `app/supabase/migrations/`, applied via Supabase CLI
   `db push` or the SQL editor (runbook: `docs/implementation/supabase-setup.md`). No local
   Docker Supabase required for the MVP.
