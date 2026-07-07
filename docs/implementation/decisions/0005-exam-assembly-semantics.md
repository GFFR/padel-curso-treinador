# 0005 — Exam assembly and scope semantics

**Status**: accepted (M3, 2026-07-07)

Points the docs left open, resolved in `app/src/lib/domain/` + `app/src/lib/services/exam-service.ts`:

1. **Runtime blueprint targets come from the DB** (`course_themes.exam_question_target`,
   seeded by M2). `computeBlueprint()` implements the documented largest-remainder
   algorithm and the test suite proves it reproduces the seeded 33/27/7/5/4/4 — so the
   algorithm is the generator, the DB column is the runtime source, and an admin can
   hand-adjust targets without a deploy.
2. **Source scope filter**: `presentations_only` serves only questions generated from
   presentations; `full_materials` serves the entire bank (presentation-generated questions
   are part of the full material set by definition).
3. **"Fallback repeats" (ADR 0005) means repeating across attempts, not within one**: the
   selector prefers least-seen questions, but a question never appears twice in the same
   attempt. If a theme's bank is smaller than its target the attempt carries fewer
   questions and the gap is recorded as `shortfall` in `blueprint_snapshot` — visible to
   admins, and scoring divides by actual question count so students are not penalized.
4. **Repeat suppression counts practice exposure too** — seen-counts come from
   `exam_attempt_questions` across both modes.
5. **Selection randomness**: Fisher-Yates shuffle then stable sort by `seenCount`, with an
   injectable seeded PRNG (mulberry32) so tests are deterministic.
6. **Known MVP limitation**: `question_snapshot` (including the correct option index) is
   readable by the attempt owner through the API while a timed exam is open. A motivated
   student could read answers early. Accepted for the MVP — this is a private study tool,
   not certification infrastructure. Fix later by splitting the snapshot into a
   student-visible part and a grading part.
7. **Practice sessions default to 10 questions**, single theme, immediate reveal; they are
   `exam_attempts` rows with `mode='practice'` (decision 0003) and are not scored 0-20.
8. **Sample questions** (`supabase/seed_sample_questions.sql`, six hand-written ED
   questions, fixed UUIDs, dev-only) unblock exam/practice flows before AI ingestion.
