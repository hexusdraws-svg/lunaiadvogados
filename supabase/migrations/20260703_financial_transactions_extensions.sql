-- Adicionar colunas para processo e divisao de honorarios em receitas
alter table public.financial_transactions
  add column if not exists process_id uuid references public.processos(id) on delete set null;

alter table public.financial_transactions
  add column if not exists fee_split_enabled boolean not null default false;

create index if not exists idx_financial_transactions_process
  on public.financial_transactions(process_id);
