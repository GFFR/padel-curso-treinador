-- Switch student identity from phone OTP to email OTP (ADR 0008, supersedes 0006).
-- Self-contained: backfills email from auth.users where possible, then drops any
-- row that still has no email (pre-launch phone-only test accounts) so the
-- not-null/unique constraint can be added safely. Paste-and-run, no manual
-- dashboard pre-step required.
--
-- Note: this only cleans up public.student_profiles. It does not touch
-- auth.users (Supabase recommends deleting auth users via the dashboard or
-- Admin API, not raw SQL) -- any orphaned phone-only auth user can be removed
-- manually afterward in Authentication -> Users if desired.

alter table public.student_profiles add column email text;

update public.student_profiles sp
set email = au.email
from auth.users au
where sp.auth_user_id = au.id
  and au.email is not null;

delete from public.student_profiles where email is null;

alter table public.student_profiles alter column email set not null;
alter table public.student_profiles add constraint student_profiles_email_key unique (email);
alter table public.student_profiles drop column phone;

-- Create/refresh a student profile whenever an auth user is created or their
-- email changes (first email-OTP login creates the auth user).
create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_profiles (auth_user_id, email)
  values (new.id, new.email)
  on conflict (auth_user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_auth_user_change();
