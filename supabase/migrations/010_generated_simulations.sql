-- 008: simulados gerados dinamicamente pelo aluno a partir do banco de questoes.
-- O catalogo continua sendo linhas com created_by null; simulados gerados sao
-- linhas por usuario (created_by = dono) montadas pela server action.

alter table public.simulations
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists is_generated boolean not null default false,
  add column if not exists criteria jsonb,
  add column if not exists created_at timestamptz not null default now();

comment on column public.simulations.created_by is
  'Dono do simulado gerado; null para simulados de catalogo.';
comment on column public.simulations.criteria is
  'Filtros usados na geracao (areas, topicos, dificuldade, quantidade, idioma).';

create index if not exists simulations_created_by_idx
  on public.simulations (created_by)
  where created_by is not null;

-- Um simulado gerado so pode ser visto pelo dono; o catalogo segue visivel
-- para qualquer usuario com acesso pago/beta.
drop policy if exists "simulations_read_authenticated" on public.simulations;
create policy "simulations_read_authenticated" on public.simulations
  for select to authenticated
  using (
    public.has_platform_access(auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "simulations_insert_generated_own" on public.simulations;
create policy "simulations_insert_generated_own" on public.simulations
  for insert to authenticated
  with check (
    public.has_platform_access(auth.uid())
    and is_generated = true
    and created_by = auth.uid()
  );

drop policy if exists "simulations_delete_generated_own" on public.simulations;
create policy "simulations_delete_generated_own" on public.simulations
  for delete to authenticated
  using (is_generated = true and created_by = auth.uid());

drop policy if exists "simulation_questions_insert_own_generated" on public.simulation_questions;
create policy "simulation_questions_insert_own_generated" on public.simulation_questions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.simulations s
      where s.id = simulation_id
        and s.is_generated
        and s.created_by = auth.uid()
    )
  );

grant insert, delete on table public.simulations to authenticated;
grant insert on table public.simulation_questions to authenticated;
