# Implementation Plan

Living status document for the Curso de Treinador de Padel Grau I study dashboard build.
Milestones come from `docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md`. Inferred decisions
made during implementation are recorded in `docs/implementation/decisions/`.

**How to resume**: read this file top to bottom, then the newest decision notes. The current
milestone section lists exactly what is done and what is next.

## Status Overview

| Milestone | Status | Notes |
| --- | --- | --- |
| M1: App scaffold | ✅ Done | Next.js 16 + TS + Tailwind 4 + shadcn in `app/`, PT landing page, lint+build green |
| M2: Data and auth foundation | ✅ Done | Migrations + RLS + seeds in `app/supabase/`, clients, proxy, runbook |
| M3: Question bank without AI | ✅ Done | Domain logic + exam service + 19 passing tests |
| M4: One-theme AI ingestion | ✅ Done (code) | Pipeline complete; live run pending keys (M7) |
| M5: Student exam and practice | ✅ Done (code) | Full PT student flows; live smoke test pending keys |
| M6: Feedback and admin | ✅ Done (code) | Thumbs, reports, admin MVP complete |
| M7: Expand ingestion | ✅ Done | All six themes ingested + verified live (2026-07-08) |

## Completed: M1 — App scaffold

- Next.js 16.2.10 App Router project in `app/` (create-next-app, `src/` dir, `@/*` alias).
- shadcn/ui initialized (base-nova style / Base UI) with button, card, badge.
- Portuguese landing page: hero, court-styled disabled cards "Simular Exame" / "Praticar por
  Tema" (Em breve badges), theme list, footer. Verified in browser.
- Padel-court design system tokens in `globals.css` (see decision 0002).
- Folder structure: `src/components/{ui,shared}`, `src/lib`, `scripts/ingestion`.
- `npm run lint` and `npm run build` pass.

Commands: `cd app && npm run dev` (dev server), `npm run build && npm start` (production).

## Completed: M2 — Data and auth foundation

- `@supabase/supabase-js` + `@supabase/ssr`; clients in `app/src/lib/supabase/`
  (browser, server-session, service-role admin) + session refresh in `app/src/proxy.ts`
  (Next 16 proxy, no-ops without env vars).
- `app/.env.example` (Supabase URL/keys + `ANTHROPIC_API_KEY` for M4).
- Migrations `app/supabase/migrations/00001_init.sql` (12 tables, triggers: profile
  auto-create from auth.users, questions.updated_at) and `00002_rls.sql` (helpers
  `current_student_id()` / `is_admin()`, full policy set).
- Seed `app/supabase/seed.sql`: six themes, calendar hours, 80-question blueprint targets.
- Runbook `docs/implementation/supabase-setup.md` (project creation, migrations, phone
  OTP + SMS provider, test OTPs, admin role).
- Source materials rows are NOT seeded — the M4 ingestion script creates them (upsert by
  theme+file) so file paths and titles come from actual extraction.

## Completed: M3 — Question bank without AI

- Pure domain modules in `app/src/lib/domain/`: `types.ts` (theme codes, scopes, exam
  constants, `QuestionSnapshot` shape), `blueprint.ts` (largest-remainder with min-4 and
  calendar-order tie-break), `scoring.ts` (0-20, pass 9.5), `assembly.ts` (repeat
  suppression + shortfall), `rng.ts` (seedable mulberry32).
- DB service `app/src/lib/services/exam-service.ts`: `createExamAttempt`,
  `createPracticeSession`, `answerAttemptQuestion` (upsert), `submitExamAttempt`.
  Runs under the student's session client (RLS enforced). Untested against live DB —
  needs a Supabase project (see runbook).
- Dev sample seed `app/supabase/seed_sample_questions.sql` (6 ED questions, fixed UUIDs).
- 19 vitest tests green (`cd app && npm test`); lint + build green.
- Semantics decisions in decision note 0005 (incl. known snapshot-leak MVP limitation).

## Completed: M4 — One-theme AI ingestion (code complete)

- Pipeline in `app/scripts/ingestion/` (see its README): unpdf extraction with page
  numbers, per-slide/per-3-page chunking, material map with density-calibrated
  FCH/antidoping split, Anthropic structured generation (`claude-opus-4-8` +
  `messages.parse` + Zod), prompt caching of the manual corpus, duplicate detection,
  deterministic quality-flag → status mapping, idempotent DB writes.
- `npm run ingest -- --theme <CODE> [--dry-run] [--scope ...]`.
- **Verified**: dry-run extraction for all six themes against the real PDFs
  (338 presentation chunks + 107 manual chunks total). Generation + DB insert not yet
  executed — requires `ANTHROPIC_API_KEY` and Supabase keys; that's the M7 gate.
- Decision note 0006 records extraction, split calibration, and generation choices.

## Completed: M5 — Student exam and practice (code complete)

- OTP login (`/entrar`, phone → SMS code, +351 normalization), logout, auth-gated
  `(student)` route group.
- Dashboard `/painel`: court-styled mode chooser, recent attempts with scores/badges.
- Full exam `/exame/[id]`: 90-min countdown with auto-submit (client + server-side
  expiry closing), question navigation grid, editable answers, confirm-submit.
- Result `/exame/[id]/resultado`: 0-20 scoreboard, pass/fail, per-theme stats, full
  review with explanations + manual references + presentation anchors.
- Practice `/praticar` → `/praticar/[id]`: theme cards with availability, untimed
  10-question sessions, immediate reveal with per-option justifications, session recap.
- Correct answers/explanations stripped from client during open exams; unreviewed
  questions visibly badged (ADR 0004). Graceful no-Supabase degradation.
- Landing page cards now link to `/entrar`. Lint/typecheck/build green; `/`,
  `/entrar` visually verified. Live OTP + exam smoke test = M7 gate. Decision 0007.

## Completed: M6 — Feedback and admin (code complete)

- `FeedbackBar` (thumbs + inline report) on practice reveals and exam review;
  floating `SupportBubble` in the student layout for general messages.
- Question reports capture the full snapshot context server-side (decision 0008).
- Admin `/admin/*`: overview (students, exams, average, pass rate, per-theme bars),
  `alunos` (per-student averages), `tentativas` (+ blueprint detail), `perguntas`
  (review queue with approve/reject via service role, thumbs-down/report badges),
  `reportes` (support messages with question context).
- All session routes forced dynamic. Lint/typecheck/tests/build green. Decision 0008.

## Completed: M7 — Expand ingestion to all themes (2026-07-08)

- User created the Supabase project, applied migrations/seeds via SQL editor, configured
  phone OTP (test OTP + Twilio) and put keys in `app/.env`.
- All six themes ingested with `claude-opus-4-8`: **~347 questions** with provenance and
  quality flags. Failed batches (transient network) were recovered surgically with the
  new `--anchors FROM..TO` CLI flag — every slide batch has coverage.
- Live smoke tests passed end-to-end: OTP login, practice with immediate reveal + linked
  manual reference, thumbs feedback (DB-verified), question report surface, admin
  overview/review-queue/approve (DB-verified), full 80-question exam assembly with exact
  blueprint 33/27/7/5/4/4 and zero shortfalls.
- Post-launch improvements shipped during M7 (decision 0009): per-attempt option
  shuffling (fixes 91%-in-A bias) and signed PDF links (private `materiais` bucket).
- The user's account (351910236363, phone OTP) was admin as of the end of M7.

## Post-launch: email OTP auth (2026-07-08)

Switched student login from phone OTP to email OTP (ADR 0008, supersedes ADR 0006;
decision 0010). Migration `00003_email_auth.sql` drops `student_profiles.phone` and adds
`email text not null unique`; `login-form.tsx` is a straight port of the two-step
phone/code UI to email/code (`signInWithOtp({ email })` /
`verifyOtp({ email, token, type: "email" })`); admin screens show email instead of
phone. No SMS provider needed anymore. The migration is self-contained (backfills
`email` from `auth.users` where possible, drops any row it can't fill in) — the
pre-migration test profile (phone 351910236363) had no email and was dropped by the
migration itself. First draft of the migration required a manual dashboard delete first
and failed in the field because the SQL editor runs a pasted script as one transaction —
fixed to be self-contained (decision 0010).

Two more issues surfaced running it live, both fixed same-day (decision 0010 postmortem
section):

- **Redirect loop**: `/entrar` redirected to `/painel` on any session cookie without
  checking a profile still existed, so the migrated-away stale session bounced forever.
  Fixed in `src/app/entrar/page.tsx`.
- **Supabase's built-in mailer caps at ~2 emails/hour** — unusable for testing or real
  students. Backend chain (verify → trigger → RLS) was proven correct anyway via
  `admin.generateLink()` + `verifyOtp()` without sending real email. Permanent fix:
  custom SMTP via Resend, documented in `docs/implementation/supabase-setup.md` §3a.

The account `goncaloramalho88@gmail.com` is live and promoted to admin. Full real-browser
click-through (typing email, receiving a real emailed code) is still pending — do it
once Resend SMTP is configured, since the built-in mailer can't sustain even one clean
test.

## Post-MVP backlog

- Review the `unreviewed` bank in `/admin/perguntas` (admin task, ongoing).
- Consider pgvector + semantic chunk selection for PDD-scale themes (0006 §10).
- Split snapshot into student-visible + grading parts to close the DB-level
  correct-answer leak during open exams (0005 §6).
- Deploy (Vercel or similar) — set env vars, rerun a build with production URL.

## Environment / Runtime Notes

- Node v23.11.1, npm 11.8.0 (developer machine, macOS).
- No live Supabase project or AI API keys are configured yet. Code is built against
  environment variables; anything requiring live services ships with a documented runbook
  instead of being executed during the build. See decision notes.
- A production server may be running on `localhost:3789` during development sessions.

## Decision Log Index

Decisions are numbered notes in `docs/implementation/decisions/`. Add a row here for each.

| # | Decision |
| --- | --- |
| 0001 | Stack versions and scaffold choices (Next 16, Tailwind 4, shadcn base-nova in M1) |
| 0002 | Visual design system: padel court identity (palette, type, signature, motion) |
| 0003 | Database schema beyond the brief (practice reuses exam_attempts, RLS posture, triggers) |
| 0004 | Auth/session infrastructure (@supabase/ssr, Next 16 proxy.ts, env no-op) |
| 0005 | Exam assembly and scope semantics (DB targets, shortfalls, snapshot-leak limitation) |
| 0006 | Ingestion pipeline (unpdf, density-based manual split, structured outputs, caching) |
| 0007 | Student UI (PT routes, client-safe snapshots, timer semantics, graceful degradation) |
| 0008 | Feedback and admin (server-side report context, review queue, force-dynamic) |
| 0009 | Option shuffling and linked source PDFs (private signed-URL bucket) |
| 0010 | Email OTP auth migration (phone -> email, ADR 0008 supersedes ADR 0006) |
