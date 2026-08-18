-- Migration: 20260726_budget_improvements.sql
-- Aprimora a tabela fee_notes para suportar orçamentos com número único e status automático.

-- 1. Garantir que document_type aceita 'budget' e 'invoice'
-- (já deve existir, mas garantimos com ALTER)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_notes' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE public.fee_notes 
      ALTER COLUMN document_type TYPE text 
      USING document_type::text;
  END IF;
END $$;

-- 2. Adicionar coluna numero para orçamentos/faturas
ALTER TABLE public.fee_notes 
  ADD COLUMN IF NOT EXISTS numero text;

-- 3. Índice para busca por número
CREATE INDEX IF NOT EXISTS idx_fee_notes_numero ON public.fee_notes(numero);

-- 4. Função para gerar próximo número de orçamento
CREATE OR REPLACE FUNCTION public.next_budget_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'ORC-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.fee_notes
  WHERE company_id = p_company_id
    AND document_type = 'budget'
    AND numero ~ ('^ORC-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

-- 5. Função para gerar próximo número de fatura
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'FT-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.fee_notes
  WHERE company_id = p_company_id
    AND document_type = 'invoice'
    AND numero ~ ('^FT-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

-- 6. Trigger para atualizar status de orçamentos expirados
CREATE OR REPLACE FUNCTION public.update_budget_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Se for orçamento e a validade terminou, marcar como expirado
  IF NEW.document_type = 'budget' AND NEW.valid_until IS NOT NULL THEN
    IF NEW.valid_until < CURRENT_DATE AND NEW.status = 'enviado' THEN
      NEW.status = 'expirado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_budget_status ON public.fee_notes;
CREATE TRIGGER trg_update_budget_status
  BEFORE INSERT OR UPDATE ON public.fee_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_status();

-- 7. Função para atualizar status de todos os orçamentos expirados
CREATE OR REPLACE FUNCTION public.expire_old_budgets()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.fee_notes
  SET status = 'expirado', updated_at = now()
  WHERE document_type = 'budget'
    AND valid_until IS NOT NULL
    AND valid_until < CURRENT_DATE
    AND status = 'enviado';
END;
$$;
