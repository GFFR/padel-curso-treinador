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

## Left alone

- The Phone/Twilio provider in Supabase Auth is not disabled — harmless to leave
  configured; the user can turn it off later.
- `docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md` (the historical origin brief)
  still describes phone OTP — it's a point-in-time artifact, not the living spec.
