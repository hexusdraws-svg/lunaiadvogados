-- Migration: 20260727_fix_valid_until_date_comparison.sql
-- Corrige comparação entre valid_until (text) e CURRENT_DATE (date)

-- 1. Corrigir a função update_budget_status para converter valid_until para date
CREATE OR REPLACE FUNCTION public.update_budget_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Se for orçamento e a validade terminou, marcar como expirado
  IF NEW.document_type = 'budget' AND NEW.valid_until IS NOT NULL THEN
    -- Converter valid_until (text) para date antes de comparar
    IF NEW.valid_until::date < CURRENT_DATE AND NEW.status = 'enviado' THEN
      NEW.status = 'expirado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Corrigir a função expire_old_budgets para converter valid_into para date
CREATE OR REPLACE FUNCTION public.expire_old_budgets()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.fee_notes
  SET status = 'expirado', updated_at = now()
  WHERE document_type = 'budget'
    AND valid_until IS NOT NULL
    AND valid_until::date < CURRENT_DATE
    AND status = 'enviado';
END;
$$;
