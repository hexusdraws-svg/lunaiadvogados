
-- Profissionais
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT,
  contacto TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read profissionais" ON public.profissionais FOR SELECT USING (true);
CREATE POLICY "public write profissionais" ON public.profissionais FOR INSERT WITH CHECK (true);
CREATE POLICY "public update profissionais" ON public.profissionais FOR UPDATE USING (true);
CREATE POLICY "public delete profissionais" ON public.profissionais FOR DELETE USING (true);

-- Templates de contrato
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read templates" ON public.contract_templates FOR SELECT USING (true);
CREATE POLICY "public write templates" ON public.contract_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "public update templates" ON public.contract_templates FOR UPDATE USING (true);
CREATE POLICY "public delete templates" ON public.contract_templates FOR DELETE USING (true);

-- Contratos gerados (histórico)
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  template_nome TEXT,
  cliente_nome TEXT,
  cliente_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  html_final TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "public write contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "public update contracts" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "public delete contracts" ON public.contracts FOR DELETE USING (true);
