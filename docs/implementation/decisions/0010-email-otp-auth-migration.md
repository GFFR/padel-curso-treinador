# 0010 — Email OTP auth migration (phone → email)

**Status**: accepted (post-M7, 2026-07-08)

Replaces phone/SMS OTP (decision 0004, ADR 0006) with email OTP (ADR 0008) after the
user tried the live phone flow and asked for something simpler to run. An email+password
option was scoped first but rejected in favor of OTP — no password storage, no
reset flow, and verification happens on every login by construction (entering the code
proves inbox control) rather than as a one-time signup step.

## What changed

1. **Schema** (`app/supabase/migrations/00003_email_auth.sql`): `student_profiles.phone`
   dropped; `email text not null unique` added. `handle_auth_user_change()` now inserts/
   updates `email` from `new.email`; the `after update of phone` trigger became
   `on_auth_user_email_updated` (`after update of email on auth.users`). The `after
   insert` trigger is untouched — same function, new column.
2. **Login UI** (`src/app/entrar/login-form.tsx`): the two-step shape from the phone flow
   is preserved exactly (step "identifier" → step "code") — only the field type
   (`tel` → `email`) and the two Supabase calls changed:
   `signInWithOtp({ phone })` → `signInWithOtp({ email })`,
   `verifyOtp({ phone, token, type: "sms" })` → `verifyOtp({ email, token, type: "email" })`.
   `normalizePhone()` is gone — email needs no normalization.
3. **`StudentContext`** (`src/lib/auth.ts`): `phone` field renamed to `email`, same
   `student_profiles` select shape otherwise.
4. **Admin display**: `alunos`, `tentativas`, `tentativas/[attemptId]`, `reportes` all
   swap their `phone` select/column for `email`. No RLS changes — every policy keys off
   `auth_user_id`, never phone/email (verified before starting: `00002_rls.sql` has zero
   phone references).
5. **No signup page, no confirm-route handler, no password fields anywhere** — `signInWithOtp`
   auto-creates the auth user on first code entry, exactly like phone did, so one form
   still serves both new and returning students.

## Migration constraint

Pre-launch, the only real row is the developer's own phone-based test profile — it has
no email to backfill (Supabase phone signups never populate `auth.users.email`).

First attempt required deleting that auth user by hand in the dashboard before running
the migration; in practice this failed in the field (`column "email" ... contains null
values`) because the Supabase SQL editor runs a pasted script as one transaction, so any
failure rolls back everything — including the `drop column phone` that had already
"succeeded" earlier in the same script. The fix is a self-contained migration instead of
a manual precondition: add `email` nullable, backfill from `auth.users` by
`auth_user_id`, delete any `student_profiles` row still without an email, *then* enforce
`not null unique`, then drop `phone`. Paste-and-run regardless of what's already there.
Doesn't touch `auth.users` (Supabase recommends the dashboard/Admin API for that, not raw
SQL) — an orphaned phone-only auth user can be removed manually afterward, or just left;
it no longer has a `student_profiles` row so it can't sign in as anyone with data.

## Two more issues found running it live

1. **Redirect loop for orphaned sessions.** `/entrar` redirected straight to `/painel`
   whenever a session cookie existed at all, without checking for a matching
   `student_profiles` row. After the migration correctly dropped the stale test profile,
   its still-valid session cookie triggered `/entrar → /painel` (no profile, bounced by
   `requireStudent()`) `→ /entrar → ...` forever. Not migration-specific — any future
   admin action that removes a profile out from under a live session would hit the same
   loop. Fixed in `src/app/entrar/page.tsx`: only redirect to `/painel` when a profile
   row also exists, mirroring `requireStudent()`'s own check.
2. **Supabase's built-in mailer caps at ~2 emails/hour per project** — unusable even for
   manual testing, let alone real students. Verified the backend chain was otherwise
   correct without waiting on the limit or sending real email, using
   `supabase.auth.admin.generateLink()` (service-role, doesn't send anything, just
   returns a valid `email_otp`) piped into `verifyOtp()` with the anon key — proved
   `verifyOtp` succeeds, the DB trigger creates the profile with the right email, and
   RLS correctly scopes a self-read using the returned session token. Permanent fix:
   custom SMTP (Resend) documented in `docs/implementation/supabase-setup.md` §3a —
   removes the cap entirely, not just a testing workaround.
3. **Two separate email templates, not one.** `signInWithOtp` uses Supabase's "Magic
   Link" template for an existing user but the "Confirm signup" template for a brand-new
   email (the common case — every student's first login). Both default to English,
   link-only bodies with no visible code, and editing only one is invisible until tested
   with a never-used address: an already-registered test email (fixed after editing
   Magic Link) kept masking that Confirm signup was still broken for first-time
   students. Both now carry a Portuguese `{{ .Token }}` body (§3b of the runbook).

## Added after the fact: clickable login link

The plan originally dropped the email link entirely (decision text above: "no signup
page, no confirm-route handler... no password fields anywhere") on the reasoning that
code-entry alone was simpler and the app had nothing to handle a link click. In practice
the code-only emails read as broken to a first-time recipient — a "Confirm your email"
subject with only a code and no visible action reads like something's missing — so the
link was added back as a convenience alongside the code, not a replacement.

Implementation, verified empirically before writing any code (`verifyOtp` with a
`token_hash` behaves identically to the plain 6-digit code — same underlying OTP record,
just a different encoding, confirmed via `admin.generateLink` + `verifyOtp` against a
disposable test address):

- **`src/app/auth/confirm/route.ts`** (new): reads `token_hash` + `type` from the query
  string, calls `supabase.auth.verifyOtp({ type, token_hash })` server-side (establishes
  the session cookie via the existing SSR server client), redirects to `/painel` on
  success or `/entrar?erro=link_invalido` on failure.
- **`login-form.tsx`**: `signInWithOtp` now passes
  `options: { emailRedirectTo: \`${window.location.origin}/auth/confirm\` }` — the link
  points at whichever origin actually made the request, not a fixed Supabase "Site URL".
  This matters because the project's Site URL is already set to a real domain
  (`https://padel.goncalofframalho.com/`), not localhost; without the per-call override,
  every email link would point at production even during local testing.
- **`/entrar`**: reads `?erro=link_invalido` and surfaces it as the existing error
  banner via a new `LoginForm({ initialError })` prop, instead of failing silently.
- Both email templates get a second CTA below the code:
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
- Requires the calling origin to be in Supabase's **Redirect URLs** allowlist (runbook
  §3c) or Supabase silently ignores `emailRedirectTo` and falls back to Site URL.

### Fourth issue: single quotes inside `style="..."` break Go's html/template

Every first-time signup started failing with a generic `500`/empty-body error right
after the templates were updated with the link. Diagnosed via Supabase's **Auth Logs**
(dashboard → Logs), which surfaced the real error hidden behind the generic client-side
message:

```
html/template:...templates/confirmation: ends in a non-text context:
{stateCSS delimDoubleQuote urlPartNone jsCtxRegexp [] attrStyle elementNone <nil>}
```

Supabase renders auth email templates with Go's context-aware `html/template` escaper,
which tracks state (`stateCSS`, `attrStyle`, ...) while parsing quoted attribute values.
Single-quoted CSS values (`font-family: ..., 'Segoe UI', ...`) nested inside a
double-quoted `style="..."` HTML attribute confuse that state machine — the template
fails to *compile* server-side, so every send fails identically, not intermittently.
Isolated by testing the same never-used-address pattern against the already-registered
`goncaloramalho88@gmail.com` (still worked — Magic Link template, same bug present but
apparently not yet triggered) versus a fresh alias (failed every time — Confirm signup
template). Fix: drop the quotes around multi-word font names in both templates
(`'Segoe UI'` → `Segoe UI`, `'SF Mono'` → `SF Mono`) — universally tolerated by mail
clients, and removes the nested-quote hazard entirely.

**Takeaway for future template edits**: never put single or double quotes inside a
`style="..."` attribute value in a Supabase email template. Check Auth Logs first for
any "Error sending confirmation email" — the client-side error is always a generic
empty 500 with no diagnostic value.

## Left alone

- The Phone/Twilio provider in Supabase Auth is not disabled — harmless to leave
  configured; the user can turn it off later.
- `docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md` (the historical origin brief)
  still describes phone OTP — it's a point-in-time artifact, not the living spec.
