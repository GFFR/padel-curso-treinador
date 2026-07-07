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
then `seed.sql` into the dashboard SQL editor and run them in that order.

The seed is idempotent (upserts by theme code); re-run it freely.

## 3. Enable phone OTP login

1. **Authentication → Providers → Phone**: enable it.
2. Pick an SMS provider (Twilio, MessageBird, Vonage, or TextLocal) and fill in its
   credentials under the phone provider settings. Without a provider, OTP SMS are not
   delivered. Costs depend on provider usage; the code does not depend on which provider
   is chosen (ADR 0006 / implementation brief).
3. For development without SMS costs: **Authentication → Providers → Phone → Test OTPs**
   lets you register fixed phone/OTP pairs that always succeed.

Student profiles are created automatically by a DB trigger on `auth.users` insert — no
app code needs to run on first login.

## 4. Make yourself admin

After your first login, in the SQL editor:

```sql
update public.student_profiles set role = 'admin' where phone = '<your phone>';
```

## Notes

- RLS is on for every table. The browser/session clients (`src/lib/supabase/client.ts`,
  `server.ts`) act as the student; ingestion scripts and admin mutations use the service
  role (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS.
- Students can read the question bank except `rejected` and `source_conflict` rows;
  exam selection logic additionally filters server-side.
