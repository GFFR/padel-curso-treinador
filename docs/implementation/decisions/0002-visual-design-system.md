# 0002 — Visual design system: padel court identity

**Status**: accepted (M1, 2026-07-07)

The UI takes its identity from the padel court itself rather than a generic dashboard look.

- **Palette** (defined as CSS variables in `app/src/app/globals.css`):
  - `--court` court blue (#1D5FA6-ish, oklch 0.51 0.12 253) — primary
  - `--court-deep` evening-court navy — dark surfaces / dark mode ground
  - `--court-line` white — lines and text on court surfaces
  - `--ball` padel-ball chartreuse (#CDDC2A-ish) — the single accent, used sparingly
    (badges, punctuation marks). Never use it for large surfaces.
  - Page ground is a light blue-grey (#EEF3F7-ish), ink is a blue-black.
- **Typography**: `Barlow Condensed` (500/600/700, uppercase, scoreboard energy) as the display
  face via `--font-heading` / `.font-heading`; `Archivo` as the body face via `--font-sans`.
  Loaded with `next/font/google` in the root layout.
- **Signature element**: primary action pairs are laid out like the two service boxes of a
  padel court — a court-blue container with white 2px "court line" borders, a center net
  divider, and a subtle half-court service line. Introduced on the landing page; reuse the
  motif for major mode choices (exam vs practice), do not repeat it everywhere.
- **Motion**: one orchestrated page-load rise (`.rise`, `.rise-2`, `.rise-3` in globals.css),
  disabled under `prefers-reduced-motion`. Avoid scattered per-element effects.
- shadcn tokens (`--primary`, `--background`, …) are mapped onto this palette, so stock
  shadcn components pick up the identity automatically. Dark mode variables are defined and
  coherent (deep court navy ground) but no theme toggle is shipped yet.
- All student-facing copy in Portuguese, sentence case, plain verbs (see `docs/language-policy.md`).

**Why**: the client asked for a designed layout, not a template; grounding tokens in the sport
keeps future screens consistent without re-deciding style each milestone.
