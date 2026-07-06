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
| M2: Data and auth foundation | 🔨 In progress | Supabase config, migrations, seeds |
| M3: Question bank without AI | ⬜ Pending | Exam assembly, scoring, tests |
| M4: One-theme AI ingestion | ⬜ Pending | PDF extraction + structured generation |
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

## Current Milestone: M2 — Data and auth foundation

Goal: Supabase env configuration, Supabase clients, phone OTP setup notes, SQL migrations for
the full MVP schema, seed data for the six course themes and 80-question blueprint.

- [ ] Supabase JS deps + browser/server client helpers
- [ ] `.env.example` with required variables
- [ ] SQL migrations for all 12 tables from the brief
- [ ] RLS policies (students read own data; admin via role)
- [ ] Seed SQL: six course themes with hours + question targets, source_materials rows
- [ ] Setup docs: how to create the Supabase project, enable phone OTP, run migrations

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
