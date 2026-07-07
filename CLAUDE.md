# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A study dashboard that helps students prepare for the Curso de Treinador de Padel Grau I exam. It ingests course PDFs, generates multiple-choice questions with AI into a strict schema, stores them in a Supabase-backed question bank, and serves 80-question timed practice exams plus untimed theme practice.

The application lives in `app/` (Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui on Base UI, Supabase, Zod, Anthropic SDK). Implementation status and per-milestone details: `docs/implementation/PLAN.md`; implementation decisions: `docs/implementation/decisions/`.

## Commands (run inside `app/`)

- `npm run dev` — dev server; `npm run build` + `npm start` — production
- `npm run lint` — ESLint; `npx tsc --noEmit` — typecheck
- `npm test` — vitest (domain logic: blueprint, scoring, assembly)
- `npm run ingest -- --theme ED [--dry-run] [--scope presentations_only]` — ingestion
  pipeline (dry-run needs no keys; full run needs Supabase + `ANTHROPIC_API_KEY`, see `app/.env.example`)

Supabase migrations/seeds are plain SQL in `app/supabase/`; live-setup runbook in `docs/implementation/supabase-setup.md`. The app degrades gracefully without Supabase env vars (landing works, login shows a setup notice).

## Source of truth

Read these before implementing anything; do not replace their decisions unless explicitly asked:

- `docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md` — the build brief: stack, database model, candidate question Zod schema, AI prompt contract, milestones, and acceptance criteria. Start here.
- `CONTEXT.md` — domain glossary. Use its terms exactly (Question Bank, Candidate Question, Presentation Anchor, Manual Reference, Source Scope, Course Theme, Exam Blueprint, …) and avoid the listed alternatives in code, UI, and docs.
- `docs/*.md` — behavior specs: `course-material-map.md` (theme weighting + PDF-to-theme mapping), `exam-behavior.md`, `ingestion-pipeline.md`, `question-provenance.md`, `question-reporting.md`, `admin-dashboard.md`, `language-policy.md`.
- `docs/adr/` — accepted architecture decisions (7 ADRs).

Source PDFs live in `Apresentações/` (in-class presentations) and `Manuais de curso IPDJ/` (official manuals). They are inputs to the ingestion pipeline, not documentation.

## Non-negotiable decisions (from the ADRs and brief)

- **The class calendar defines the exam blueprint.** Theme weighting comes from calendar hours, not from material size. Current 80-question targets: PDD 33, TMTD 27, FCH 7, FCH - Doping 5, ED 4, DA 4 — computed with deterministic largest-remainder rounding, minimum 4 questions per taught theme, ties resolved by first calendar occurrence.
- **AI generates; deterministic code validates and persists.** AI output must pass Zod validation before any database insert; malformed candidates are rejected, never repaired silently. Extraction, theme mapping, duplicate detection, quality flags, and persistence are deterministic code.
- **Every question keeps two source roles**: a presentation anchor (why it's exam-relevant) and a manual reference (justifies the explanation, shown to students). Missing manual reference → flag `weak_manual_reference`; disagreeing sources → flag `source_conflict` and require admin review before student use.
- **Questions live in a reusable question bank** with stable identity and review status (`unreviewed`, `approved`, `rejected`, `weakly_sourced`, `source_conflict`). Unreviewed questions may appear to students but must be visibly marked and carry thumbs up/down + report affordances.
- **Exam attempts are fresh random assemblies saved as stable snapshots**, preferring questions the student has seen less often, falling back to repeats when a theme's bank is small.
- **Auth is Supabase phone OTP.** Supabase Auth owns sessions; Supabase Postgres owns app data; first login creates/updates a `student_profiles` row keyed by the auth user ID. Keep the SMS provider swappable.

## Key domain rules

- Scoring: 80 questions × 0.25 points on the Portuguese 0-20 scale; pass at 9.5; wrong/unanswered = 0. Full exams have a 90-minute timer and reveal answers only after submit/expiry; practice sessions are untimed and reveal answers immediately.
- Theme codes: `PDD`, `TMTD`, `FCH`, `FCH_DOPING` (displayed as "FCH - Doping"), `ED`, `DA`. Source scopes: `presentations_only`, `full_materials`.
- `FUNCIONAMENTO CH ANTIDOPAGEM_GI.pdf` spans both FCH and FCH - Doping — ingestion must split/tag its chunks by subtopic, not assign the whole manual to one theme.
- Question reports must snapshot full question context (prompt, options, correct answer, explanation, sources, theme, scope, attempt ID, student's answer) so they stay useful after the question changes.
- "All of the above"/"none of the above" options are allowed sparingly and require per-option justification.

## Language policy

Student-facing UI, generated questions, options, and explanations are in **Portuguese**. Code, code comments, and developer docs are in English.

## Build approach

Follow the milestones in the implementation brief in order (scaffold → data/auth → question bank without AI → one-theme ingestion → student exam/practice → feedback/admin → full ingestion). Build a thin end-to-end vertical slice before expanding; start ingestion with a small theme (`ED` or `DA`). Prefer boring, explicit database tables over clever abstractions.
