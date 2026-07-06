# 0001 — Stack versions and scaffold choices

**Status**: accepted (M1, 2026-07-07)

The brief recommends Next.js App Router + TypeScript + Tailwind + shadcn/ui. Concrete versions
and choices made at scaffold time:

- **Next.js 16.2.10** (App Router, Turbopack builds), **React 19.2**, **TypeScript 5**, **Tailwind CSS 4**
  (CSS-first config via `@theme` in `globals.css`; there is no `tailwind.config.*` file).
- **shadcn/ui** initialized in M1 (not deferred) so every later milestone builds on the same
  component base. The current shadcn CLI default is the **base-nova** style on **Base UI**
  primitives (not Radix) with lucide icons — kept as-is.
- Project layout: `src/` dir with `@/*` alias. `src/components/ui` (shadcn), `src/components/shared`
  (app components), `src/lib` (domain + utils), `scripts/ingestion` (M4+ pipeline scripts, run
  server-side with tsx/node, not part of the Next.js bundle).
- Node engine on the dev machine is v23; Next warns about engines but works. No action needed.
- create-next-app generated `app/AGENTS.md` + `app/CLAUDE.md` pointing agents at
  `node_modules/next/dist/docs/` for Next 16 conventions — kept, they are useful.

**Why**: these are the current stable defaults of the recommended stack; pinning them here saves
re-discovery when resuming work.
