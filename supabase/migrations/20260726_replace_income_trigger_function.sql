-- Migration: 20260726_replace_income_trigger_function.sql
-- Substitui totalmente a função public.handle_income_transaction_created()
-- por uma versão compatível com o schema atual das tabelas:
--   financial_transactions, fee_notes, receipts
--
-- Esta migration:
-- 1) Recria a função handle_income_transaction_created() com colunas atuais
-- 2) Corrige tipos de dados nos COALESCE (date com date, text com text)
-- 3) Usa next_receipt_number(company_id) para gerar o número do recibo
-- 4) Insere em receipts apenas com colunas existentes
-- 5) Atualiza fee_notes quando existe fatura/documento associado
-- 6) Recria o trigger trg_income_transaction_insert

-- Garantir que a função next_receipt_number existe
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'REC-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(receipt_number,'-',3) as int)),0)+1, 5, '0')
  FROM public.receipts
  WHERE company_id = p_company_id
    AND receipt_number ~ ('^REC-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

-- Recriar função handle_income_transaction_created com schema atual
CREATE OR REPLACE FUNCTION public.handle_income_transaction_created()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_fee_note public.fee_notes%ROWTYPE;
  v_receipt_num text;
BEGIN
  IF NEW.transaction_type <> 'income' THEN
    RETURN NEW;
  END IF;

  -- Buscar fatura/documento associado pela transaction
  -- Tenta encontrar via client_id + process_id + company_id
  IF NEW.client_id IS NOT NULL AND NEW.process_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE cliente_id = NEW.client_id
      AND processo_id = NEW.process_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  -- Se não encontrou, tenta apenas por client_id
  IF v_fee_note IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE cliente_id = NEW.client_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  -- Se ainda não encontrou, tenta por process_id
  IF v_fee_note IS NULL AND NEW.process_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE processo_id = NEW.process_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
      AND status NOT IN ('paga', 'cancelada')
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  -- Atualizar fee_notes se encontrou documento associado
  IF v_fee_note IS NOT NULL THEN
    UPDATE public.fee_notes
    SET paid_amount = paid_amount + NEW.amount,
        balance = total - (paid_amount + NEW.amount),
        status = CASE WHEN total - (paid_amount + NEW.amount) <= 0 THEN 'paga' ELSE 'parcialmente_paga' END,
        updated_at = now()
    WHERE id = v_fee_note.id;
  END IF;

  -- Gerar número do recibo
  SELECT public.next_receipt_number(NEW.company_id) INTO v_receipt_num;

  -- Inserir receipt com colunas atuais
  INSERT INTO public.receipts (
    company_id,
    fee_note_id,
    transaction_id,
    receipt_number,
    amount,
    payment_method,
    receipt_date,
    pdf_url,
    created_by
  )
  VALUES (
    NEW.company_id,
    CASE WHEN v_fee_note.id IS NOT NULL THEN v_fee_note.id ELSE NULL END,
    NEW.id,
    v_receipt_num,
    NEW.amount,
    COALESCE(NEW.payment_method, 'transferencia'),
    COALESCE(NEW.payment_date::date, NEW.due_date::date, CURRENT_DATE),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_income_transaction_insert ON public.financial_transactions;
CREATE TRIGGER trg_income_transaction_insert
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_income_transaction_created();
