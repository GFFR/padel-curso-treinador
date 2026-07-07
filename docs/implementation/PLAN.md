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
| M4: One-theme AI ingestion | 🔨 In progress | PDF extraction + structured generation |
| M5: Student exam and practice | ⬜ Pending | OTP auth, exam UI, practice UI |
| M6: Feedback and admin | ⬜ Pending | Thumbs, reports, admin MVP |
| M7: Expand ingestion | ⬜ Pending | All six themes |

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

## Current Milestone: M4 — One-theme AI ingestion

Goal: PDF → chunks → AI structured candidates → validated DB insert, for ED or DA.

- [ ] PDF text extraction with page numbers (scripts/ingestion)
- [ ] Material map config (file → theme, incl. FCH/antidoping split rule)
- [ ] Zod CandidateQuestionSchema from the brief
- [ ] AI generation via Anthropic structured output
- [ ] Duplicate detection + quality flags
- [ ] Insert generation_batches / questions / question_options via service role
- [ ] Runbook for executing against live Supabase + API key

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
