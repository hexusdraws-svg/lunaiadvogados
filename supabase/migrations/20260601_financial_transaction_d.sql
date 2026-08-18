-- Financial Transactions Despesas table
CREATE TABLE public.financial_transaction_d (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  expense_category TEXT,
  amount NUMERIC NOT NULL,
  professional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
  professional_name TEXT,
  due_date DATE NOT NULL,
  payment_date DATE,
  frequency TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transaction_d ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.financial_transaction_d FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.financial_transaction_d FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.financial_transaction_d FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.financial_transaction_d FOR DELETE USING (true);

CREATE INDEX idx_financial_transaction_d_company ON public.financial_transaction_d(company_id);