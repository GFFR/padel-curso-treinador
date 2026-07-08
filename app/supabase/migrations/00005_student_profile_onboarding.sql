-- Student display name + optional avatar for post-OTP onboarding.

alter table public.student_profiles
  add column display_name text,
  add column avatar_path text;

comment on column public.student_profiles.display_name is
  'Set during onboarding; null means the student has not completed welcome setup.';
comment on column public.student_profiles.avatar_path is
  'Object path inside the avatars storage bucket, e.g. {auth_user_id}/avatar.jpg';

-- Students may update their own profile row (name / avatar path).
create policy "profiles updatable by owner"
  on public.student_profiles for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- Public avatar bucket — filenames are unguessable UUID paths.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

create policy "avatars readable by anyone"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars insertable by owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars updatable by owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars deletable by owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
