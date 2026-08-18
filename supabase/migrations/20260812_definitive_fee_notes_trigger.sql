-- Migration: 20260812_definitive_fee_notes_paid_amount_trigger.sql
-- Correção arquitetural definitiva:
-- - fee_notes é a fonte de verdade das faturas
-- - financial_transactions registra movimentos, mas NÃO é usada pela UI para calcular paid_amount/balance
-- - Trigger atualiza fee_notes de forma segura e idempotente

-- 1. Garantir que financial_transactions possui fee_note_id para associação direta
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_fee_note ON public.financial_transactions(fee_note_id);

-- 2. Adicionar colunas de controle financeiro em fee_notes
ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0;

-- 3. Corrigir constraint de status para aceitar tanto orçamentos quanto faturas
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.fee_notes'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status IN (%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.fee_notes DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.fee_notes
  ADD CONSTRAINT fee_notes_status_check
  CHECK (status IN (
    'rascunho',
    'enviado',
    'aceite',
    'recusado',
    'rejeitado',
    'expirado',
    'pendente',
    'parcial',
    'pago',
    'cancelado'
  ));

-- 4. Sincronizar valores existentes para faturas
UPDATE public.fee_notes
SET paid_amount = paid_amount
WHERE document_type = 'invoice' AND paid_amount IS NULL;

UPDATE public.fee_notes
SET balance = GREATEST(COALESCE(total, 0) - paid_amount, 0)
WHERE document_type = 'invoice';

-- 5. Remover trigger/function anteriores para evitar duplicação
DROP TRIGGER IF EXISTS trg_income_transaction_insert ON public.financial_transactions;
DROP FUNCTION IF EXISTS public.handle_income_transaction_created() CASCADE;

-- 6. Criar função limpa e segura para atualizar fee_notes e gerar receipt
CREATE OR REPLACE FUNCTION public.handle_income_transaction_created()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_fee_note public.fee_notes%ROWTYPE;
  v_paid numeric(12,2);
  v_receipt_num text;
  v_existing_receipt uuid;
BEGIN
  IF NEW.transaction_type <> 'income' THEN
    RETURN NEW;
  END IF;

  -- Prioridade 1: associar diretamente via fee_note_id (quando disponível)
  IF NEW.fee_note_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE id = NEW.fee_note_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
    LIMIT 1;
  END IF;

  -- Prioridade 2: procurar por client_id + company_id
  IF v_fee_note IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE cliente_id = NEW.client_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  -- Prioridade 3: procurar por processo + company_id
  IF v_fee_note IS NULL AND NEW.process_id IS NOT NULL THEN
    SELECT * INTO v_fee_note FROM public.fee_notes
    WHERE processo_id = NEW.process_id
      AND company_id = NEW.company_id
      AND document_type = 'invoice'
    ORDER BY issue_date DESC LIMIT 1;
  END IF;

  -- Atualizar fee_notes apenas se encontrou fatura associada
  IF v_fee_note IS NOT NULL THEN
    -- Recalcular paid_amount a partir da soma de TODAS as transações de income da fatura
    SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.financial_transactions
    WHERE fee_note_id = v_fee_note.id
      AND company_id = NEW.company_id
      AND transaction_type = 'income';

    UPDATE public.fee_notes
    SET paid_amount = v_paid,
        balance = GREATEST(COALESCE(total, 0) - v_paid, 0),
        status = CASE
          WHEN v_paid <= 0 THEN COALESCE(v_fee_note.status, 'pendente')
          WHEN v_paid >= COALESCE(total, 0) THEN 'pago'
          ELSE 'parcial'
        END,
        updated_at = now()
    WHERE id = v_fee_note.id;
  END IF;

  -- Evitar duplicação de receipt para a mesma transação
  SELECT id INTO v_existing_receipt FROM public.receipts
  WHERE transaction_id = NEW.id
  LIMIT 1;

  IF v_existing_receipt IS NULL THEN
    SELECT public.next_receipt_number(NEW.company_id) INTO v_receipt_num;

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
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Recriar trigger
CREATE TRIGGER trg_income_transaction_insert
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_income_transaction_created();
