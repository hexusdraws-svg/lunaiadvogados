-- Migration: 20260726_remove_payments_and_invoice_items.sql
-- Remove tabelas obsoletas payments e invoice_items.
-- Ajusta receipts para usar financial_transactions e fee_notes.
-- Cria trigger para atualizar fee_notes e gerar receipt automaticamente a partir de financial_transactions (income).

-- 1. Remover triggers de updated_at das tabelas obsoletas
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
DROP TRIGGER IF EXISTS trg_after_payment_insert ON public.payments;
DROP TRIGGER IF EXISTS trg_invoice_items_updated_at ON public.invoice_items;

-- 2. Remover tabelas obsoletas
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;

-- 3. Ajustar receipts para nova arquitetura
ALTER TABLE public.receipts
  DROP COLUMN IF EXISTS payment_id,
  DROP COLUMN IF EXISTS invoice_id,
  ADD COLUMN IF NOT EXISTS financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL;

-- 4. Trigger para atualizar fee_notes e gerar receipt automaticamente após inserir financial_transactions (income)
CREATE OR REPLACE FUNCTION public.handle_income_transaction_created()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_fee_note public.fee_notes%ROWTYPE;
  v_receipt_num text;
BEGIN
  IF NEW.transaction_type <> 'income' THEN
    RETURN NEW;
  END IF;

  IF NEW.fee_note_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes WHERE id = NEW.fee_note_id LIMIT 1;
  END IF;

  IF v_fee_note IS NULL AND NEW.processo_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE processo_id = NEW.processo_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  IF v_fee_note IS NULL AND NEW.cliente_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE cliente_id = NEW.cliente_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  IF v_fee_note IS NOT NULL THEN
    UPDATE public.fee_notes
    SET paid_amount = paid_amount + NEW.amount,
        balance = total - (paid_amount + NEW.amount),
        status = CASE WHEN total - (paid_amount + NEW.amount) <= 0 THEN 'paga' ELSE 'parcialmente_paga' END,
        updated_at = now()
    WHERE id = v_fee_note.id;
  END IF;

  SELECT public.next_receipt_number(NEW.company_id) INTO v_receipt_num;

  INSERT INTO public.receipts (
    company_id,
    financial_transaction_id,
    fee_note_id,
    cliente_id,
    processo_id,
    numero,
    amount,
    payment_method,
    reference,
    received_at
  )
  VALUES (
    NEW.company_id,
    NEW.id,
    COALESCE(v_fee_note.id, NEW.fee_note_id),
    COALESCE(v_fee_note.cliente_id, NEW.cliente_id),
    COALESCE(v_fee_note.processo_id, NEW.processo_id),
    v_receipt_num,
    NEW.amount,
    COALESCE(NEW.payment_method, 'transferencia'),
    NEW.reference,
    COALESCE(NEW.payment_date::text, NEW.due_date, CURRENT_DATE::text)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_income_transaction_insert ON public.financial_transactions;
CREATE TRIGGER trg_income_transaction_insert
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_income_transaction_created();
