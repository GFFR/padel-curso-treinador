-- Extend leaderboard: one row per student (best qualifying attempt), optional unlimited fetch.

create or replace function public.get_exam_leaderboard(p_limit integer default 5)
returns table (
  attempt_id uuid,
  student_id uuid,
  display_name text,
  avatar_path text,
  score_0_20 numeric,
  passed boolean,
  submitted_at timestamptz,
  answered_count bigint,
  total_questions bigint,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with attempt_progress as (
    select
      a.id as attempt_id,
      a.student_id,
      a.score_0_20,
      a.passed,
      a.submitted_at,
      count(aq.id) as total_questions,
      count(ans.id) filter (where ans.selected_option_index is not null) as answered_count
    from public.exam_attempts a
    join public.exam_attempt_questions aq on aq.exam_attempt_id = a.id
    left join public.exam_attempt_answers ans on ans.exam_attempt_question_id = aq.id
    where a.mode = 'exam'
      and a.submitted_at is not null
    group by a.id, a.student_id, a.score_0_20, a.passed, a.submitted_at
    having
      count(ans.id) filter (where ans.selected_option_index is not null)::numeric
      / nullif(count(aq.id), 0) > 0.9
  ),
  best_per_student as (
    select distinct on (ap.student_id)
      ap.attempt_id,
      ap.student_id,
      ap.score_0_20,
      ap.passed,
      ap.submitted_at,
      ap.answered_count,
      ap.total_questions
    from attempt_progress ap
    order by ap.student_id, ap.score_0_20 desc, ap.submitted_at desc
  ),
  ranked as (
    select
      bp.attempt_id,
      bp.student_id,
      sp.display_name,
      sp.avatar_path,
      bp.score_0_20,
      bp.passed,
      bp.submitted_at,
      bp.answered_count,
      bp.total_questions,
      row_number() over (
        order by bp.score_0_20 desc, bp.submitted_at desc
      ) as rank
    from best_per_student bp
    join public.student_profiles sp on sp.id = bp.student_id
    where sp.display_name is not null
      and trim(sp.display_name) <> ''
  )
  select
    attempt_id,
    student_id,
    display_name,
    avatar_path,
    score_0_20,
    passed,
    submitted_at,
    answered_count,
    total_questions,
    rank
  from ranked
  where p_limit is null or rank <= p_limit
  order by rank;
$$;
