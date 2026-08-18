-- Migration: 20260726_reconcile_receipts_schema.sql
-- Reconcilia a tabela receipts para o schema atual e recria funções/triggers associadas.
--
-- Schema atual esperado para receipts:
--   id, company_id, fee_note_id, transaction_id, receipt_number,
--   amount, payment_method, receipt_date, pdf_url, created_by, created_at
--
-- Esta migration:
-- 1) Ajusta colunas da tabela receipts (adiciona/renomeia conforme necessário)
-- 2) Recria public.next_receipt_number(uuid) usando receipt_number
-- 3) Recria a trigger de income em financial_transactions para inserir receipts com o schema atual
-- 4) Remove referências a colunas antigas (numero, received_at, reference, financial_transaction_id, cliente_id, processo_id)

-- 1. Ajustar colunas de receipts
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS receipt_date date,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Se existirem colunas antigas, mover dados para as novas quando possível
-- payment_id -> transaction_id (apenas se payments ainda existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'payment_id') THEN
    BEGIN
      ALTER TABLE public.receipts DROP COLUMN payment_id;
    EXCEPTION
      WHEN others THEN
        -- Se houver dependência, apenas tenta remover a constraint primeiro
        ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_payment_id_fkey;
        ALTER TABLE public.receipts DROP COLUMN payment_id;
    END;
  END IF;
END $$;

-- invoice_id -> fee_note_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'invoice_id') THEN
    BEGIN
      ALTER TABLE public.receipts DROP COLUMN invoice_id;
    EXCEPTION
      WHEN others THEN
        ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey;
        ALTER TABLE public.receipts DROP COLUMN invoice_id;
    END;
  END IF;
END $$;

-- numero -> receipt_number
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'numero') THEN
    ALTER TABLE public.receipts RENAME COLUMN numero TO receipt_number;
  END IF;
END $$;

-- received_at -> receipt_date
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'received_at') THEN
    ALTER TABLE public.receipts RENAME COLUMN received_at TO receipt_date;
  END IF;
END $$;

-- cliente_id/processo_id podem ser removidos se não forem mais necessários
-- Mantemos por compatibilidade, mas a arquitetura atual usa fee_note_id + transaction_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'cliente_id') THEN
    ALTER TABLE public.receipts DROP COLUMN IF EXISTS cliente_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'processo_id') THEN
    ALTER TABLE public.receipts DROP COLUMN IF EXISTS processo_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'reference') THEN
    ALTER TABLE public.receipts DROP COLUMN IF EXISTS reference;
  END IF;
END $$;

-- Se existir financial_transaction_id antigo, garantir que é o mesmo que transaction_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'financial_transaction_id') THEN
    ALTER TABLE public.receipts DROP COLUMN IF EXISTS financial_transaction_id;
  END IF;
END $$;

-- Garantir constraints corretas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'receipts' AND constraint_name = 'receipts_fee_note_id_fkey'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_fee_note_id_fkey FOREIGN KEY (fee_note_id) REFERENCES public.fee_notes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'receipts' AND constraint_name = 'receipts_transaction_id_fkey'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.financial_transactions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'receipts' AND constraint_name = 'receipts_created_by_fkey'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_receipts_company ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_fee_note ON public.receipts(fee_note_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction ON public.receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);

-- 2. Função para gerar número de recibo por empresa
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'REC-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(receipt_number,'-',3) as int)),0)+1, 5, '0')
  FROM public.receipts
  WHERE company_id = p_company_id
    AND receipt_number ~ ('^REC-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

-- 3. Trigger de income em financial_transactions usando o schema atual de receipts
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

  IF v_fee_note IS NULL AND NEW.client_id IS NOT NULL THEN
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
    v_fee_note.id,
    NEW.id,
    v_receipt_num,
    NEW.amount,
    COALESCE(NEW.payment_method, 'transferencia'),
    COALESCE(NEW.payment_date::text, NEW.due_date, CURRENT_DATE::text),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_income_transaction_insert ON public.financial_transactions;
CREATE TRIGGER trg_income_transaction_insert
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_income_transaction_created();
