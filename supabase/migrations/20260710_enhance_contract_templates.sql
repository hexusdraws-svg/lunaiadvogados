-- Migration: 20260710_enhance_contract_templates.sql
-- Objetivo: Adicionar campos necessários para o módulo de modelos de contrato

ALTER TABLE public.contract_templates
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Outros',
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

COMMENT ON COLUMN public.contract_templates.description IS 'Descrição opcional do modelo';
COMMENT ON COLUMN public.contract_templates.category IS 'Categoria jurídica (ex: Direito Civil, Trabalho, etc.)';
COMMENT ON COLUMN public.contract_templates.status IS 'Estado do modelo: active ou archived';
COMMENT ON COLUMN public.contract_templates.author_id IS 'ID do utilizador que criou o modelo';
COMMENT ON COLUMN public.contract_templates.variables IS 'Array de variáveis usadas no modelo (metadados)';
COMMENT ON COLUMN public.contract_templates.is_system IS 'Se é um modelo nativo do sistema';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_company_id ON public.contract_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_status ON public.contract_templates(status);
CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON public.contract_templates(category);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_contract_templates_updated_at ON public.contract_templates;
CREATE TRIGGER trg_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();
