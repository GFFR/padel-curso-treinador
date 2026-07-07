-- DEV-ONLY sample questions (theme ED) to exercise exam assembly, practice,
-- scoring, and result screens before the AI ingestion pipeline runs (M3).
-- Hand-written, no source references (anchors null) — flagged weak_manual_reference
-- where appropriate would be noise for samples, so they ship as plain 'approved'.
-- Idempotent via fixed UUIDs. Remove with:
--   delete from questions where id::text like '00000000-0000-4000-8000-%';

with ed as (select id from public.course_themes where code = 'ED')
insert into public.questions
  (id, theme_id, source_scope, prompt, correct_option_index, explanation, status)
select v.id::uuid, ed.id, v.scope, v.prompt, v.correct_idx, v.explanation, 'approved'
from ed, (values
  ('00000000-0000-4000-8000-000000000001',
   'full_materials',
   'O que se entende por fair play no desporto?',
   1,
   'O fair play é o respeito pelas regras, pelos adversários, pelos árbitros e pelo espírito do jogo, indo além do simples cumprimento formal do regulamento.'),
  ('00000000-0000-4000-8000-000000000002',
   'full_materials',
   'Qual das seguintes situações representa uma violação da ética desportiva por parte do treinador?',
   2,
   'Incentivar um atleta a simular lesão para obter vantagem é uma forma de batota e viola frontalmente a ética desportiva; as restantes opções descrevem comportamentos corretos.'),
  ('00000000-0000-4000-8000-000000000003',
   'full_materials',
   'No contexto do desporto para jovens, o principal papel ético do treinador de Grau I é:',
   0,
   'No escalão de formação, o desenvolvimento integral do praticante (valores, saúde, prazer pela prática) prevalece sobre o resultado competitivo imediato.'),
  ('00000000-0000-4000-8000-000000000004',
   'presentations_only',
   'A carta olímpica e os códigos de ética desportiva defendem que a prática desportiva é:',
   3,
   'Os documentos de referência da ética desportiva consagram a prática desportiva como um direito de todos, sem discriminação.'),
  ('00000000-0000-4000-8000-000000000005',
   'presentations_only',
   'Perante um comportamento violento entre pais/encarregados de educação durante um jogo de jovens, o treinador deve:',
   1,
   'O treinador deve proteger os praticantes e promover um ambiente seguro, intervindo de forma calma e reportando a situação à organização — nunca ignorar nem alimentar o conflito.'),
  ('00000000-0000-4000-8000-000000000006',
   'full_materials',
   'Qual destas afirmações sobre a ética no desporto é correta?',
   2,
   'A ética desportiva aplica-se a todos os agentes desportivos — praticantes, treinadores, dirigentes, árbitros e público — e não apenas aos atletas de alta competição.')
) as v(id, scope, prompt, correct_idx, explanation)
on conflict (id) do nothing;

insert into public.question_options (question_id, option_index, text)
values
  ('00000000-0000-4000-8000-000000000001', 0, 'Cumprir apenas o regulamento escrito da modalidade'),
  ('00000000-0000-4000-8000-000000000001', 1, 'Respeitar as regras, os adversários, os árbitros e o espírito do jogo'),
  ('00000000-0000-4000-8000-000000000001', 2, 'Evitar cartões e sanções disciplinares durante a época'),
  ('00000000-0000-4000-8000-000000000001', 3, 'Ganhar demonstrando superioridade técnica'),

  ('00000000-0000-4000-8000-000000000002', 0, 'Dar o mesmo tempo de jogo a todos os jovens praticantes'),
  ('00000000-0000-4000-8000-000000000002', 1, 'Cumprimentar a equipa adversária no final do jogo'),
  ('00000000-0000-4000-8000-000000000002', 2, 'Incentivar um atleta a simular lesão para obter vantagem'),
  ('00000000-0000-4000-8000-000000000002', 3, 'Corrigir um erro de arbitragem a favor do adversário'),

  ('00000000-0000-4000-8000-000000000003', 0, 'Promover o desenvolvimento integral e os valores do praticante'),
  ('00000000-0000-4000-8000-000000000003', 1, 'Garantir o maior número possível de vitórias'),
  ('00000000-0000-4000-8000-000000000003', 2, 'Selecionar cedo os mais talentosos e focar o treino neles'),
  ('00000000-0000-4000-8000-000000000003', 3, 'Preparar os atletas exclusivamente para a alta competição'),

  ('00000000-0000-4000-8000-000000000004', 0, 'Um privilégio dos atletas federados'),
  ('00000000-0000-4000-8000-000000000004', 1, 'Uma atividade reservada a quem tem aptidão física'),
  ('00000000-0000-4000-8000-000000000004', 2, 'Uma obrigação cívica dos cidadãos'),
  ('00000000-0000-4000-8000-000000000004', 3, 'Um direito de todos, sem discriminação'),

  ('00000000-0000-4000-8000-000000000005', 0, 'Ignorar, porque o jogo decorre dentro do campo'),
  ('00000000-0000-4000-8000-000000000005', 1, 'Proteger os praticantes, acalmar a situação e reportar à organização'),
  ('00000000-0000-4000-8000-000000000005', 2, 'Interromper definitivamente o jogo e abandonar o recinto'),
  ('00000000-0000-4000-8000-000000000005', 3, 'Responder aos envolvidos no mesmo tom para impor respeito'),

  ('00000000-0000-4000-8000-000000000006', 0, 'Aplica-se apenas aos praticantes durante a competição'),
  ('00000000-0000-4000-8000-000000000006', 1, 'É da responsabilidade exclusiva dos árbitros'),
  ('00000000-0000-4000-8000-000000000006', 2, 'Aplica-se a todos os agentes desportivos, dentro e fora do campo'),
  ('00000000-0000-4000-8000-000000000006', 3, 'Só é relevante no desporto profissional')
on conflict (question_id, option_index) do nothing;
