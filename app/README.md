# Curso de Treinador de Padel Grau I — Study Dashboard

Next.js app for exam preparation: 80-question timed exam simulations, untimed theme
practice, AI-generated questions with source provenance, and an admin dashboard.
Product docs and decisions live at the repo root (`CONTEXT.md`, `docs/`).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain logic tests (vitest)
npm run lint
npm run build
```

Without Supabase configuration the landing page works and `/entrar` shows a setup
notice. For the full app:

1. Follow `../docs/implementation/supabase-setup.md` (project, migrations, phone OTP).
2. `cp .env.example .env.local` and fill in the values.

## Structure

- `src/app` — routes: `/` (landing), `/entrar` (OTP login), `(student)` group
  (`/painel`, `/exame/[id]`, `/exame/[id]/resultado`, `/praticar`, `/praticar/[id]`,
  `/admin/*`)
- `src/lib/domain` — pure exam logic (blueprint, scoring, selection) + tests
- `src/lib/services` — Supabase-backed exam assembly/submission
- `src/lib/actions` — server actions (exam, feedback, admin)
- `src/lib/supabase` — browser/server/admin clients; `src/proxy.ts` refreshes sessions
- `scripts/ingestion` — PDF → AI question pipeline (`npm run ingest`, see its README)
- `supabase/` — SQL migrations and seeds
