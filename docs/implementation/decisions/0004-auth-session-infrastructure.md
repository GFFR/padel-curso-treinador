# 0004 — Auth/session infrastructure choices

**Status**: accepted (M2, 2026-07-07)

- **`@supabase/ssr`** is the session mechanism: browser client for Client Components,
  cookie-bound server client for Server Components/Actions, and session refresh in
  **`src/proxy.ts`** — Next.js 16 renamed middleware to proxy; the file exports `proxy()`
  instead of `middleware()`.
- The proxy **no-ops when Supabase env vars are missing**, so early milestones and CI run
  without a live project.
- A **service-role client** (`src/lib/supabase/admin.ts`, guarded by `server-only`) exists
  for admin mutations inside Next. Standalone ingestion scripts construct their own
  service-role client rather than importing app modules.
- Route protection is deferred to M5 and will live with the route groups (layouts/server
  checks), not in the proxy — the proxy only refreshes tokens, per Next.js guidance that
  proxy should not be the authorization layer.
- Env names stay `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY`; Supabase's newer "publishable/secret" key format works in
  the same slots.
