<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent rules (all models)

Read `../CLAUDE.md` and `../CONTEXT.md` for domain and stack context. This file adds **dev workflow** rules that prevent recurring production failures.

## Before finishing any change

Run from `app/`:

```bash
npm run check:utf8   # catches Latin-1 / Windows-1252 text that breaks Nixpacks deploy
npm run lint
npx tsc --noEmit
npm run build        # prebuild runs check:utf8 automatically
```

Do not mark work complete until `npm run build` passes locally.

## File encoding (critical)

- **All source files must be UTF-8.** Nixpacks and Turbopack reject invalid byte sequences; `npm run dev` may still work on macOS.
- Student-facing Portuguese strings (`ã`, `ç`, `é`, `í`, `ó`, `ú`, `—`, `·`) must be real UTF-8 characters, not Latin-1 or Windows-1252 bytes.
- When editing UI copy, prefer `\u` escapes only in generated code — hand-written TSX/SQL should use literal UTF-8.
- After touching files with Portuguese text, run `npm run check:utf8`.

## Scope and conventions

- App code lives in `app/`; run commands there, not repo root.
- Student UI in Portuguese; code and dev docs in English.
- Minimize diff scope; match existing patterns; no silent Zod repair of AI output.
- Do not commit `.env` or secrets.

## Deploy checklist

1. `npm run build` passes in `app/`
2. Env vars documented in `.env.example` are set in Dokploy
3. Supabase migrations applied if schema changed
