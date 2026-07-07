-- Seed: six course themes with calendar hours and the 80-question blueprint.
-- Source of truth: docs/course-material-map.md (largest-remainder rounding,
-- minimum four questions per taught theme, tie -> first calendar occurrence).
-- Idempotent: upserts by theme code.

insert into public.course_themes (code, name, calendar_hours, exam_question_target, sort_order)
values
  ('PDD', 'Pedagogia e Didática do Desporto', 15, 33, 1),
  ('TMTD', 'Teoria e Metodologia do Treino Desportivo', 12, 27, 2),
  ('FCH', 'Funcionamento do Corpo Humano', 3, 7, 3),
  ('FCH_DOPING', 'Luta contra a Dopagem', 2, 5, 4),
  ('ED', 'Ética no Desporto', 2, 4, 5),
  ('DA', 'Desporto Adaptado', 2, 4, 6)
on conflict (code) do update set
  name = excluded.name,
  calendar_hours = excluded.calendar_hours,
  exam_question_target = excluded.exam_question_target,
  sort_order = excluded.sort_order;
