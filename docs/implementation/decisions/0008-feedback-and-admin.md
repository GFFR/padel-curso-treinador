# 0008 — Feedback, reporting, and admin implementation choices

**Status**: accepted (M6, 2026-07-07)

1. **Two report surfaces** (docs/question-reporting.md): a floating support bubble in
   the student layout for general suggestions/bugs (no question context), and a
   `FeedbackBar` next to every revealed question (practice reveal + exam review) with
   thumbs up/down plus an inline "Reportar problema" form.
2. **Report context is assembled server-side** from the attempt snapshot inside the
   `reportQuestion` action: stable question id, prompt, options, correct answer,
   explanation, both source references, theme, scope, attempt id, and the student's
   selected answer. The client only sends `attemptQuestionId` + message — so reports
   survive later question edits AND the correct answer never rides through the browser
   during an open exam.
3. **Thumbs are an upsert** on `(student_id, question_id)` (decision 0003): re-voting
   changes the vote. The UI keeps per-session local state only; existing votes are not
   preloaded (MVP simplification).
4. **Admin area lives under the student layout** (`/admin/*`, nested `requireAdmin()`
   layout): overview tiles + per-theme aggregate bars, students with per-student
   averages, completed-attempt list + blueprint-snapshot detail, question review queue,
   support report list.
5. **Admin reads use the session client** (RLS `is_admin()` select policies); the only
   admin mutation — approving/rejecting a question — goes through the service-role
   client after an explicit `requireAdmin()` check, because the question bank is
   deliberately read-only under RLS.
6. **Review queue shows student signals inline**: thumbs-down and report counts appear
   as badges on each pending question, covering the "reported and thumbs-down
   questions" dashboard requirement without a separate screen (reports themselves have
   their own page for reading messages).
7. **Aggregations are computed in the server component** from plain selects — fine at
   MVP scale; move to SQL views/RPC when data grows.
8. **`force-dynamic` on `(student)` layout and `/entrar`**: session-dependent pages
   must never be statically prerendered (a build without env vars would freeze the
   login redirect into HTML).
