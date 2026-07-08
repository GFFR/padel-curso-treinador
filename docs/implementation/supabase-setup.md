# Supabase Setup Runbook

How to stand up the live backend for the study dashboard. Nothing in the codebase requires
this until you want real auth/data — the app runs without env vars (proxy skips session
refresh when `NEXT_PUBLIC_SUPABASE_URL` is unset).

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com) (EU region recommended — students are in Portugal).
2. In **Settings → API**, copy the project URL, the anon/publishable key, and the
   service role/secret key.
3. In `app/`: `cp .env.example .env.local` and fill in the values.

## 2. Apply migrations and seed

Option A — Supabase CLI (recommended, keeps history):

```bash
cd app
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push          # applies supabase/migrations/*.sql in order
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # or paste seed.sql in the SQL editor
```

Option B — SQL editor: paste `supabase/migrations/00001_init.sql`, then `00002_rls.sql`,
then `00003_email_auth.sql`, then `00004_question_bank_sets.sql`, then
`00005_student_profile_onboarding.sql`, then `seed.sql` into the dashboard SQL editor and run them in
that order.

The seed is idempotent (upserts by theme code); re-run it freely.

## 3. Enable email OTP login

1. **Authentication → Providers → Email**: enabled by default. Make sure "Confirm email" /
   OTP-style sign-in is on (not password-only) so `signInWithOtp` sends a one-time code
   instead of a magic link — the exact toggle name varies by dashboard version.
2. **Set up custom SMTP immediately — do not rely on the built-in mailer.** Supabase's
   own email sender is capped at ~2 emails/hour per project, which isn't usable even for
   testing, let alone real students. See step 3a below (Resend).
3. No SMS provider is needed (ADR 0008 supersedes the phone/Twilio setup in ADR 0006).

### 3a. Custom SMTP via Resend (removes the 2/hour cap)

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day, 3,000/month —
   no credit card required).
2. **Dashboard → API Keys → Create API Key** (full access is fine for a single project).
   Copy the key (starts with `re_`) — it's shown once.
3. In Supabase: **Authentication → Settings → SMTP Settings** → enable "Custom SMTP" and
   fill in:
   - **Sender email**: `onboarding@resend.dev` (works immediately, no domain verification
     needed — good enough until you want a branded `@yourdomain.com` sender, which needs
     verifying a domain in Resend first)
   - **Sender name**: e.g. `Padel Grau I`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: the API key from step 2
4. Save. The built-in rate limit no longer applies — sends now go through Resend's much
   higher limits, and delivery is typically near-instant.

### 3b. Edit BOTH email templates, not just "Magic Link"

Supabase picks the email template for `signInWithOtp({ email })` based on whether the
address already has an account, not on any code path we control:

- **Existing user** → **Magic Link** template.
- **Brand-new email** (the common case — every student's first login) → **Confirm
  signup** template.

Both are separate, independently-edited tabs under **Authentication → Email Templates**,
and both default to an English, link-only body. **Edit both templates** to show the
6-digit code in Portuguese via `{{ .Token }}`, *and* a clickable login link via
`{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` — the app supports both:
type the code, or click through (`src/app/auth/confirm/route.ts` verifies the link
server-side and redirects to `/painel`). Test with a never-used email address, not one
you already signed in with once, or you'll only exercise the Magic Link template and
miss a broken Confirm-signup template.

**Never put quotes inside a `style="..."` attribute in these templates.** Supabase
renders them with Go's `html/template`, which fails to compile the whole template if a
`style` attribute contains nested quotes (e.g. `font-family: ..., 'Segoe UI', ...`) —
every send then fails with a generic empty `500` and no useful client-side error. Use
unquoted multi-word font names instead. If a send fails for a reason that isn't obvious,
check **Logs → Auth Logs** in the dashboard first — the real error (e.g.
`html/template: ... ends in a non-text context`) only shows up there, never in the
client SDK's error object.

### 3c. Allow the local dev origin to receive the login link

The app passes `emailRedirectTo: \`${window.location.origin}/auth/confirm\`` on every
`signInWithOtp` call, so the link in the email points back at whichever origin actually
made the request (`login-form.tsx`). Supabase only honors a redirect target that's on
its allowlist — **Authentication → URL Configuration → Redirect URLs** — otherwise it
silently falls back to the project's Site URL instead.

Add `http://localhost:3789/**` to that allowlist for local dev. Without it, clicking the
link from a local test tries to redirect to the production Site URL instead of your
local server. Add the real deployed origin (e.g. `https://yourdomain.com/**`) when you
go to production.

Student profiles are created automatically by a DB trigger on `auth.users` insert — no
app code needs to run on first login.

**If you previously set up phone OTP**: migration `00003_email_auth.sql` is self-contained
— it backfills `email` from `auth.users` where possible and drops any `student_profiles`
row it still can't fill in (a phone-only test account has no email to backfill), so it's
safe to paste and run as-is. It does not delete the underlying phone-only `auth.users`
row; remove that manually in **Authentication → Users** afterward if you want, then sign
in fresh with email OTP.

## 4. Make yourself admin

After your first login, in the SQL editor:

```sql
update public.student_profiles set role = 'admin' where email = '<your email>';
```

## Notes

- RLS is on for every table. The browser/session clients (`src/lib/supabase/client.ts`,
  `server.ts`) act as the student; ingestion scripts and admin mutations use the service
  role (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS.
- Students can read the question bank except `rejected` and `source_conflict` rows;
  exam selection logic additionally filters server-side.
