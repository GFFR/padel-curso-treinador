-- Leaderboard RPC: top completed exam attempts by score, requiring >90% answered.
-- Runs as security definer so authenticated students can see anonymised peer rankings
-- (display name + avatar only) without opening full exam_attempts RLS.

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
  ranked as (
    select
      ap.attempt_id,
      ap.student_id,
      sp.display_name,
      sp.avatar_path,
      ap.score_0_20,
      ap.passed,
      ap.submitted_at,
      ap.answered_count,
      ap.total_questions,
      row_number() over (
        order by ap.score_0_20 desc, ap.submitted_at desc
      ) as rank
    from attempt_progress ap
    join public.student_profiles sp on sp.id = ap.student_id
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
  where rank <= greatest(p_limit, 1)
  order by rank;
$$;

revoke all on function public.get_exam_leaderboard(integer) from public;
grant execute on function public.get_exam_leaderboard(integer) to authenticated;
