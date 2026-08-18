-- Migration: 20260726_create_financial_transactions.sql
-- Cria tabela financial_transactions usada pelo módulo financeiro atual.
-- Mantém compatibilidade com hooks existentes e com a trigger de recebimentos.

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  client_name text,
  professional_id uuid REFERENCES public.profissionais(id) ON DELETE SET NULL,
  professional_name text,
  transaction_type text NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('income','expense','transfer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled','processing')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_date date,
  payment_method text,
  reference text,
  frequency text NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly','weekly','yearly')),
  attachment_url text,
  attachment_type text,
  fee_split_enabled boolean NOT NULL DEFAULT false,
  process_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_client ON public.financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_process ON public.financial_transactions(process_id);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage financial_transactions"
ON public.financial_transactions
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS trg_financial_transactions_updated_at ON public.financial_transactions;
