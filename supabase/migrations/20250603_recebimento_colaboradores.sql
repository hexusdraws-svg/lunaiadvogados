-- Tabela para divisão de honorários nos recebimentos
create table if not exists public.recebimento_colaboradores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recebimento_id uuid not null references public.financial_transactions(id) on delete cascade,
  profissional_id uuid not null references public.profiles(id) on delete cascade,
  percentagem numeric not null check (percentagem >= 0 and percentagem <= 100),
  valor_calculado numeric not null default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.recebimento_colaboradores enable row level security;

create policy "Professionals can view their own splits"
  on public.recebimento_colaboradores
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profissional_id
        and p.company_id = company_id
    )
  );

create policy "Admins can manage splits"
  on public.recebimento_colaboradores
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = company_id
        and p.role in ('admin', 'super_admin')
    )
  );

create index if not exists idx_recebimento_colaboradores_recebimento
  on public.recebimento_colaboradores(recebimento_id);

create index if not exists idx_recebimento_colaboradores_profissional
  on public.recebimento_colaboradores(profissional_id);
