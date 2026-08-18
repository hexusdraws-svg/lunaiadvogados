-- Migration: 20260724_financial_restructuring.sql
-- Nova arquitetura financeira: Notas de Honorários, Faturas, Recebimentos, Despesas e Recibos.
-- Mantém `financial_transactions` existente para compatibilidade, mas o novo fluxo usa entidades separadas.

-- 1. Notas de Honorários (Orçamentos)
CREATE TABLE IF NOT EXISTS public.fee_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  numero text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','aceite','recusado','expirado')),
  document_type text NOT NULL DEFAULT 'budget' CHECK (document_type IN ('budget','invoice')),
  source_fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL,
  observations text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_notes_company ON public.fee_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_fee_notes_client ON public.fee_notes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fee_notes_processo ON public.fee_notes(processo_id);

ALTER TABLE public.fee_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage fee notes"
ON public.fee_notes
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


-- 3. Faturas
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL,
  numero text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcialmente_paga','paga','cancelada')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  observations text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(cliente_id);
CREATE INDEX IF NOT EXISTS idx_invoices_processo ON public.invoices(processo_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fee_note ON public.invoices(fee_note_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage invoices"
ON public.invoices
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


-- 5. Recebimentos
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'transferencia' CHECK (payment_method IN ('dinheiro','transferencia','pos','cheque','mpesa','emola','banco','outro')),
  reference text,
  notes text,
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage payments"
ON public.payments
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

-- 6. Recibos (automáticos)
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  numero text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  reference text,
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_company ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(cliente_id);
CREATE INDEX IF NOT EXISTS idx_receipts_processo ON public.receipts(processo_id);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage receipts"
ON public.receipts
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

-- 7. Despesas (nova entidade separada)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  payment_date date,
  payment_method text CHECK (payment_method IN ('dinheiro','transferencia','pos','cheque','mpesa','emola','banco','outro')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','cancelado')),
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attachment_url text,
  recurrence text CHECK (recurrence IN ('nenhum','semanal','quinzenal','mensal','trimestral','semestral','anual')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_professional ON public.expenses(professional_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage expenses"
ON public.expenses
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

-- 8. Sequências/helpers para numeração automática
CREATE OR REPLACE FUNCTION public.next_fee_note_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'NH-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.fee_notes
  WHERE company_id = p_company_id
    AND numero ~ ('^NH-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'FT-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.invoices
  WHERE company_id = p_company_id
    AND numero ~ ('^FT-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'REC-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.receipts
  WHERE company_id = p_company_id
    AND numero ~ ('^REC-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;

-- 9. Trigger para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_financial_timestamps()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_notes_updated_at ON public.fee_notes;
CREATE TRIGGER trg_fee_notes_updated_at
  BEFORE UPDATE ON public.fee_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();

DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.receipts;
CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_timestamps();

-- 10. Trigger para gerar recibo automaticamente após pagamento e atualizar status da fatura
CREATE OR REPLACE FUNCTION public.handle_payment_created()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_receipt_num text;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id;

  IF v_invoice IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.invoices
  SET paid_amount = paid_amount + NEW.amount,
      balance = total - (paid_amount + NEW.amount),
      status = CASE WHEN total - (paid_amount + NEW.amount) <= 0 THEN 'paga' ELSE 'parcialmente_paga' END,
      updated_at = now()
  WHERE id = v_invoice.id;

  IF v_invoice.status IS DISTINCT FROM CASE WHEN v_invoice.total - (v_invoice.paid_amount + NEW.amount) <= 0 THEN 'paga' ELSE 'parcialmente_paga' END THEN
    UPDATE public.invoices
    SET status = CASE WHEN total - (paid_amount + NEW.amount) <= 0 THEN 'paga' ELSE 'parcialmente_paga' END
    WHERE id = v_invoice.id;
  END IF;

  SELECT public.next_receipt_number(NEW.company_id) INTO v_receipt_num;

  INSERT INTO public.receipts (
    company_id,
    payment_id,
    invoice_id,
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
    v_invoice.id,
    v_invoice.cliente_id,
    v_invoice.processo_id,
    v_receipt_num,
    NEW.amount,
    NEW.payment_method,
    NEW.reference,
    NEW.received_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_payment_insert ON public.payments;
CREATE TRIGGER trg_after_payment_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_created();

-- 11. Storage bucket para recibos PDF
-- Nota: bucket deve ser criado manualmente no Supabase Storage como "receipts"
-- Esta migration apenas prepara o uso futuramente.
