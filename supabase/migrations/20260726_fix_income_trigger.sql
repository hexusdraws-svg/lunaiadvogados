-- Migration: 20260726_fix_income_trigger.sql
-- Corrige trigger handle_income_transaction_created para usar apenas colunas existentes em financial_transactions.
-- Remove dependência de fee_note_id e fields que não existem na tabela.

CREATE OR REPLACE FUNCTION public.handle_income_transaction_created()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_fee_note public.fee_notes%ROWTYPE;
  v_receipt_num text;
BEGIN
  IF NEW.transaction_type <> 'income' THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE cliente_id = NEW.client_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  IF v_fee_note IS NULL AND NEW.process_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE processo_id = NEW.process_id
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
    v_fee_note.id,
    v_fee_note.cliente_id,
    v_fee_note.processo_id,
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
