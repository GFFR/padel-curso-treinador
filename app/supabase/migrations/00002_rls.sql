-- Row Level Security for the MVP.
-- Students act through their session (anon key + RLS); ingestion scripts and
-- privileged admin operations use the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.student_profiles
  where auth_user_id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_profiles
    where auth_user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.course_themes enable row level security;
alter table public.source_materials enable row level security;
alter table public.source_chunks enable row level security;
alter table public.generation_batches enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.student_profiles enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_questions enable row level security;
alter table public.exam_attempt_answers enable row level security;
alter table public.question_feedback enable row level security;
alter table public.support_reports enable row level security;

-- ---------------------------------------------------------------------------
-- Reference data: any signed-in student can read
-- ---------------------------------------------------------------------------
create policy "themes readable by authenticated"
  on public.course_themes for select
  to authenticated
  using (true);

create policy "materials readable by authenticated"
  on public.source_materials for select
  to authenticated
  using (true);

-- Chunks and generation batches are pipeline internals: admin eyes only.
create policy "chunks readable by admins"
  on public.source_chunks for select
  to authenticated
  using (public.is_admin());

create policy "batches readable by admins"
  on public.generation_batches for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Question bank: students may see everything except rejected and
-- source-conflict questions (ADR 0004: unreviewed allowed with feedback;
-- docs/question-provenance.md: source conflicts need admin review first).
-- ---------------------------------------------------------------------------
create policy "questions readable by students"
  on public.questions for select
  to authenticated
  using (
    status in ('unreviewed', 'approved', 'weakly_sourced')
    or public.is_admin()
  );

create policy "options readable with their question"
  on public.question_options for select
  to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_id
        and (
          q.status in ('unreviewed', 'approved', 'weakly_sourced')
          or public.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Profiles: own row (admins see all)
-- ---------------------------------------------------------------------------
create policy "profiles readable by owner or admin"
  on public.student_profiles for select
  to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Attempts: students own their attempts end to end; admins can read all.
-- ---------------------------------------------------------------------------
create policy "attempts readable by owner or admin"
  on public.exam_attempts for select
  to authenticated
  using (student_id = public.current_student_id() or public.is_admin());

create policy "attempts insertable by owner"
  on public.exam_attempts for insert
  to authenticated
  with check (student_id = public.current_student_id());

create policy "attempts updatable by owner"
  on public.exam_attempts for update
  to authenticated
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "attempt questions readable by owner or admin"
  on public.exam_attempt_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.exam_attempts a
      where a.id = exam_attempt_id
        and (a.student_id = public.current_student_id() or public.is_admin())
    )
  );

create policy "attempt questions insertable by owner"
  on public.exam_attempt_questions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.exam_attempts a
      where a.id = exam_attempt_id
        and a.student_id = public.current_student_id()
    )
  );

create policy "answers readable by owner or admin"
  on public.exam_attempt_answers for select
  to authenticated
  using (
    exists (
      select 1
      from public.exam_attempt_questions aq
      join public.exam_attempts a on a.id = aq.exam_attempt_id
      where aq.id = exam_attempt_question_id
        and (a.student_id = public.current_student_id() or public.is_admin())
    )
  );

create policy "answers insertable by owner"
  on public.exam_attempt_answers for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.exam_attempt_questions aq
      join public.exam_attempts a on a.id = aq.exam_attempt_id
      where aq.id = exam_attempt_question_id
        and a.student_id = public.current_student_id()
    )
  );

create policy "answers updatable by owner"
  on public.exam_attempt_answers for update
  to authenticated
  using (
    exists (
      select 1
      from public.exam_attempt_questions aq
      join public.exam_attempts a on a.id = aq.exam_attempt_id
      where aq.id = exam_attempt_question_id
        and a.student_id = public.current_student_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Feedback and support
-- ---------------------------------------------------------------------------
create policy "feedback readable by owner or admin"
  on public.question_feedback for select
  to authenticated
  using (student_id = public.current_student_id() or public.is_admin());

create policy "feedback insertable by owner"
  on public.question_feedback for insert
  to authenticated
  with check (student_id = public.current_student_id());

create policy "feedback updatable by owner"
  on public.question_feedback for update
  to authenticated
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "reports readable by owner or admin"
  on public.support_reports for select
  to authenticated
  using (student_id = public.current_student_id() or public.is_admin());

create policy "reports insertable by owner"
  on public.support_reports for insert
  to authenticated
  with check (student_id = public.current_student_id());
