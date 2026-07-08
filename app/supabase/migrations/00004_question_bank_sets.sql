-- Question bank sets (v1, v2) with global default + optional per-theme override.
-- Existing questions are backfilled to v1; new v2 ingestion writes to v2.

create table public.question_bank_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.question_bank_sets (code, label, description)
values
  (
    'v1',
    'Banco v1',
    'Ingestao manual-heavy, prompt v1 -- corpus completo de manuais no prefixo.'
  ),
  (
    'v2',
    'Banco v2',
    'Presentation-first, quota por ancora, prompt v2 -- pergunta respondivel pelo slide.'
  );

alter table public.questions
  add column bank_set_id uuid references public.question_bank_sets (id);

update public.questions q
set bank_set_id = (select id from public.question_bank_sets where code = 'v1')
where q.bank_set_id is null;

alter table public.questions
  alter column bank_set_id set not null;

create index questions_bank_theme_status_idx
  on public.questions (bank_set_id, theme_id, status);

-- theme_id NULL = global default; non-null = per-theme override.
create table public.bank_set_activation (
  id uuid primary key default gen_random_uuid(),
  bank_set_id uuid not null references public.question_bank_sets (id) on delete cascade,
  theme_id uuid references public.course_themes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (theme_id)
);

-- Global default: v1 (unchanged student experience until admin flips).
insert into public.bank_set_activation (bank_set_id, theme_id)
select id, null from public.question_bank_sets where code = 'v1';

alter table public.question_bank_sets enable row level security;
alter table public.bank_set_activation enable row level security;

create policy "bank sets readable by authenticated"
  on public.question_bank_sets for select
  to authenticated
  using (true);

create policy "bank set activation readable by authenticated"
  on public.bank_set_activation for select
  to authenticated
  using (true);
