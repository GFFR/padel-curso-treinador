# 0007 — Student UI implementation choices

**Status**: accepted (M5, 2026-07-07)

1. **Portuguese route names**: `/entrar` (login), `/painel` (dashboard), `/exame/[id]`,
   `/exame/[id]/resultado`, `/praticar`, `/praticar/[id]`. Student-facing URLs are part
   of the student-facing language (language policy).
2. **Auth gating lives in the `(student)` route group** via `requireStudent()`
   (`src/lib/auth.ts`): server-side `getUser()` + profile fetch, redirect to `/entrar`.
   The proxy only refreshes tokens (decision 0004).
3. **Client-safe snapshots**: exam/practice pages strip `question_snapshot` to prompt +
   options before sending to the browser. Correct answers and explanations never enter
   page props during an open exam; in practice mode they come back through the
   `answerQuestion` server action response after each answer (immediate reveal,
   docs/exam-behavior.md). The DB-level snapshot leak remains a known MVP limitation
   (decision 0005 §6).
4. **Exam timer semantics**: countdown to `expires_at`; client auto-submits on expiry,
   and the server page also closes any expired-but-unsubmitted attempt on load, so a
   student who closes the tab still gets a scored result.
5. **Answers are editable until submission** (upsert; decision 0003); practice allows
   exactly one answer per question (the reveal makes changes meaningless) and questions
   can be skipped.
6. **Unreviewed marking (ADR 0004)**: any non-approved question renders a
   "Gerada por IA — por rever" badge in exam, practice, and review screens.
7. **Result screen doubles as the explanation view**: 0-20 scoreboard on court-deep
   navy, per-theme breakdown, full question review with correct/selected marking,
   explanation, manual reference ("Estudo:") and presentation anchor ("Aula:").
8. **Phone normalization**: 9-digit numbers starting with 9 get +351 automatically;
   full E.164 passes through.
9. **Graceful degradation without Supabase env**: `/entrar` renders a setup notice,
   protected routes redirect there, landing works fully. Verified with curl + browser.
10. **OTP and full exam flows are not yet exercised against a live Supabase project**
    (no project exists yet). Everything compiles, typechecks, and follows the
    documented supabase-js APIs; first live smoke test is part of the M7 runbook.
