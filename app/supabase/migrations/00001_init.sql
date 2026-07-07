-- Curso de Treinador de Padel Grau I — MVP schema
-- Tables follow docs/ai-agent-implementation/IMPLEMENTATION_BRIEF.md.
-- Deviations are recorded in docs/implementation/decisions/.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Course themes: calendar-defined learning areas; the calendar is the source
-- of truth for exam weighting (ADR 0002).
-- ---------------------------------------------------------------------------
create table public.course_themes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code in ('PDD', 'TMTD', 'FCH', 'FCH_DOPING', 'ED', 'DA')),
  name text not null,
  calendar_hours numeric not null check (calendar_hours > 0),
  exam_question_target integer not null check (exam_question_target >= 0),
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Source materials: presentations and IPDJ manuals mapped to themes.
-- A file that spans two themes (the FCH/antidoping manual) gets one row per
-- theme; chunks carry their own theme_id for the fine-grained split.
-- ---------------------------------------------------------------------------
create table public.source_materials (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.course_themes (id),
  kind text not null check (kind in ('presentation', 'manual')),
  file_name text not null,
  file_path text,
  title text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (theme_id, file_name)
);

-- ---------------------------------------------------------------------------
-- Source chunks: page-ranged text extracted from a material, tagged by theme.
-- (Embedding column intentionally deferred; see decision notes.)
-- ---------------------------------------------------------------------------
create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_material_id uuid not null references public.source_materials (id) on delete cascade,
  theme_id uuid not null references public.course_themes (id),
  page_start integer not null check (page_start > 0),
  page_end integer not null check (page_end > 0),
  section_title text,
  content text not null,
  created_at timestamptz not null default now(),
  check (page_end >= page_start)
);

create index source_chunks_theme_idx on public.source_chunks (theme_id);
create index source_chunks_material_idx on public.source_chunks (source_material_id);

-- ---------------------------------------------------------------------------
-- Generation batches: one AI generation run for a theme + source scope.
-- ---------------------------------------------------------------------------
create table public.generation_batches (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.course_themes (id),
  source_scope text not null
    check (source_scope in ('presentations_only', 'full_materials')),
  model text not null,
  prompt_version text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  raw_output jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Questions: the question bank (ADR 0003). Candidate questions enter as
-- 'unreviewed' or with a quality status; only validated rows are inserted.
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.course_themes (id),
  generation_batch_id uuid references public.generation_batches (id),
  source_scope text not null
    check (source_scope in ('presentations_only', 'full_materials')),
  prompt text not null,
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  explanation text not null,
  status text not null default 'unreviewed'
    check (status in ('unreviewed', 'approved', 'rejected', 'weakly_sourced', 'source_conflict')),
  presentation_anchor_material_id uuid references public.source_materials (id),
  presentation_anchor_page integer,
  manual_reference_material_id uuid references public.source_materials (id),
  manual_reference_page integer,
  manual_reference_section text,
  quality_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_theme_status_idx on public.questions (theme_id, status);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_index integer not null check (option_index between 0 and 3),
  text text not null,
  justification text,
  unique (question_id, option_index)
);

-- ---------------------------------------------------------------------------
-- Student profiles: one per Supabase Auth user (phone OTP, ADR 0006).
-- Created by trigger on auth.users.
-- ---------------------------------------------------------------------------
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Exam attempts: full timed exams AND untimed practice sessions share this
-- table, distinguished by mode (see decision notes). Attempts snapshot their
-- questions so later edits never change history (ADR 0005).
-- ---------------------------------------------------------------------------
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  mode text not null default 'exam' check (mode in ('exam', 'practice')),
  source_scope text not null
    check (source_scope in ('presentations_only', 'full_materials')),
  practice_theme_id uuid references public.course_themes (id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  expires_at timestamptz,
  score_0_20 numeric(4, 2) check (score_0_20 between 0 and 20),
  passed boolean,
  blueprint_snapshot jsonb,
  check (mode <> 'practice' or practice_theme_id is not null),
  check (mode <> 'exam' or practice_theme_id is null)
);

create index exam_attempts_student_idx on public.exam_attempts (student_id, started_at desc);

create table public.exam_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  exam_attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  position integer not null check (position >= 0),
  theme_id uuid not null references public.course_themes (id),
  question_snapshot jsonb not null,
  unique (exam_attempt_id, position)
);

create index exam_attempt_questions_question_idx
  on public.exam_attempt_questions (question_id);

create table public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  exam_attempt_question_id uuid not null unique
    references public.exam_attempt_questions (id) on delete cascade,
  selected_option_index integer check (selected_option_index between 0 and 3),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Feedback and support (ADR 0004, docs/question-reporting.md).
-- ---------------------------------------------------------------------------
create table public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  exam_attempt_id uuid references public.exam_attempts (id) on delete set null,
  value text not null check (value in ('thumbs_up', 'thumbs_down')),
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create table public.support_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.student_profiles (id) on delete set null,
  question_id uuid references public.questions (id) on delete set null,
  exam_attempt_id uuid references public.exam_attempts (id) on delete set null,
  kind text not null check (kind in ('bug', 'suggestion')),
  message text not null,
  question_context jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- Create/refresh a student profile whenever an auth user is created or their
-- phone changes (first OTP login creates the auth user).
create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_profiles (auth_user_id, phone)
  values (new.id, new.phone)
  on conflict (auth_user_id) do update set phone = excluded.phone;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_change();

create trigger on_auth_user_phone_updated
  after update of phone on auth.users
  for each row execute function public.handle_auth_user_change();
