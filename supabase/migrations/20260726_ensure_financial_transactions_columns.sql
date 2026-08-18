-- Migration: 20260726_ensure_financial_transactions_columns.sql
-- Garante que a tabela financial_transactions existe e tem todas as colunas necessárias
-- para o fluxo de recebimentos atual.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions' AND table_schema = 'public') THEN
    CREATE TABLE public.financial_transactions (
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
  END IF;
END $$;

-- Adicionar colunas que podem estar faltando em tabela existente
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.profissionais(id) ON DELETE SET NULL;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS professional_name text;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS process_id uuid REFERENCES public.processos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_client ON public.financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_process ON public.financial_transactions(process_id);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can manage financial_transactions" ON public.financial_transactions;
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
CREATE TRIGGER trg_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();
