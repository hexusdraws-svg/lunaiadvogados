-- Clientes table for financial transactions
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  contacto TEXT,
  email TEXT,
  endereco TEXT,
  nacionalidade TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "public write clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "public update clientes" ON public.clientes FOR UPDATE USING (true);

CREATE INDEX idx_clientes_company ON public.clientes(company_id);
CREATE INDEX idx_clientes_nome ON public.clientes(nome);