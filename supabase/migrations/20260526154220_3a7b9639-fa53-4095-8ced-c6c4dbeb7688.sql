
-- 1. COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  logo_url text,
  assinatura_url text,
  telefone text,
  email text,
  endereco text,
  nuit text,
  cidade text,
  pais text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "public write companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "public update companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "public delete companies" ON public.companies FOR DELETE USING (true);

-- 2. Add company_id to existing tables
ALTER TABLE public.profissionais ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contract_templates ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contract_templates ADD COLUMN is_native boolean NOT NULL DEFAULT false;
ALTER TABLE public.contracts ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contracts ADD COLUMN numero text;
ALTER TABLE public.contracts ADD COLUMN status text NOT NULL DEFAULT 'gerado';
ALTER TABLE public.contracts ADD COLUMN tipo text;

CREATE INDEX idx_contracts_company ON public.contracts(company_id);
CREATE INDEX idx_templates_company ON public.contract_templates(company_id);
CREATE INDEX idx_profissionais_company ON public.profissionais(company_id);

-- 3. Sequence helper for numero (per company per year)
CREATE OR REPLACE FUNCTION public.next_contract_number(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year int := EXTRACT(year FROM now())::int;
  _count int;
BEGIN
  SELECT COUNT(*) + 1 INTO _count
  FROM public.contracts
  WHERE company_id = _company_id
    AND EXTRACT(year FROM created_at)::int = _year;
  RETURN 'CTR-' || _year || '-' || LPAD(_count::text, 4, '0');
END;
$$;

-- 4. Storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read company-assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "public upload company-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "public update company-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets');
CREATE POLICY "public delete company-assets" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets');

-- 5. Seed native templates (globais — company_id NULL)
INSERT INTO public.contract_templates (nome, tipo, is_native, html_content) VALUES
(
  'Contrato de Arrendamento (Modelo Nativo)',
  'arrendamento',
  true,
  '<h1 style="text-align:center">CONTRATO DE ARRENDAMENTO</h1>
<p>Entre <strong>{{empresa_nome}}</strong>, com sede em {{empresa_endereco}}, NUIT {{empresa_nuit}}, doravante designada <strong>LOCADORA</strong>,</p>
<p>e <strong>{{cliente_nome}}</strong>, portador do documento {{cliente_documento}}, emitido em {{cliente_emissao}}, nacionalidade {{cliente_nacionalidade}}, contacto {{cliente_contacto}}, doravante designado <strong>LOCATÁRIO</strong>,</p>
<p>é celebrado o presente contrato de arrendamento, regido pelas cláusulas seguintes:</p>
<h2>Cláusula 1ª — Objecto</h2>
<p>A LOCADORA dá de arrendamento ao LOCATÁRIO o imóvel sito em {{imovel_endereco}}.</p>
<h2>Cláusula 2ª — Prazo</h2>
<p>O presente contrato tem a duração de {{contrato_duracao}}, com início em {{contrato_inicio}}.</p>
<h2>Cláusula 3ª — Renda</h2>
<p>A renda mensal é de {{contrato_valor}} ({{contrato_valor_extenso}}), paga até ao dia {{contrato_dia_pagamento}} de cada mês.</p>
<h2>Cláusula 4ª — Obrigações</h2>
<p>O LOCATÁRIO obriga-se a conservar o imóvel e a utilizá-lo conforme o fim a que se destina.</p>
<h2>Cláusula 5ª — Disposições Finais</h2>
<p>O presente contrato é feito em duplicado, ficando um exemplar com cada parte.</p>
<p style="margin-top:48px">{{empresa_cidade}}, {{contrato_data}}</p>
<p style="margin-top:64px">_______________________________<br/>LOCADORA · {{empresa_nome}}</p>
<p style="margin-top:48px">_______________________________<br/>LOCATÁRIO · {{cliente_nome}}</p>'
),
(
  'Contrato de Compra e Venda (Modelo Nativo)',
  'venda',
  true,
  '<h1 style="text-align:center">CONTRATO DE COMPRA E VENDA</h1>
<p>Entre <strong>{{empresa_nome}}</strong>, com sede em {{empresa_endereco}}, NUIT {{empresa_nuit}}, na qualidade de intermediária da operação, e:</p>
<p><strong>VENDEDOR:</strong> {{vendedor_nome}}, documento {{vendedor_documento}}.</p>
<p><strong>COMPRADOR:</strong> {{cliente_nome}}, documento {{cliente_documento}}, emitido em {{cliente_emissao}}, nacionalidade {{cliente_nacionalidade}}, contacto {{cliente_contacto}}.</p>
<h2>Cláusula 1ª — Objecto</h2>
<p>O VENDEDOR vende ao COMPRADOR o imóvel sito em {{imovel_endereco}}, registado sob o nº {{imovel_registo}}.</p>
<h2>Cláusula 2ª — Preço</h2>
<p>O preço acordado é de {{contrato_valor}} ({{contrato_valor_extenso}}), a ser pago conforme {{contrato_forma_pagamento}}.</p>
<h2>Cláusula 3ª — Entrega</h2>
<p>O imóvel será entregue livre de quaisquer ónus em {{contrato_data_entrega}}.</p>
<h2>Cláusula 4ª — Disposições Finais</h2>
<p>O presente contrato é feito em duplicado e tem força executiva entre as partes.</p>
<p style="margin-top:48px">{{empresa_cidade}}, {{contrato_data}}</p>
<p style="margin-top:64px">_______________________________<br/>VENDEDOR</p>
<p style="margin-top:48px">_______________________________<br/>COMPRADOR · {{cliente_nome}}</p>'
);
