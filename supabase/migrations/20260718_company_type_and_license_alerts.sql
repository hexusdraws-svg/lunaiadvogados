-- Migration: 20260718_company_type_and_license_alerts.sql
-- Objetivo:
--   PARTE 6  -> Adicionar coluna company_type (office | freelancer) à tabela companies.
--   PARTE 11 -> Criar tabela company_license_alerts para alertas de expiração criados pelo Super Admin.
-- Nota: NÃO altera arquitetura multi-tenant, RLS existente, autenticação nem notificações existentes.

-- =========================================================
-- PARTE 6 — COMPANY TYPE
-- =========================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type text NOT NULL DEFAULT 'office'
  CHECK (company_type IN ('office', 'freelancer'));

COMMENT ON COLUMN public.companies.company_type IS 'Tipo da empresa: office (escritório) ou freelancer';

CREATE INDEX IF NOT EXISTS idx_companies_company_type ON public.companies(company_type);

-- =========================================================
-- PARTE 11 — COMPANY LICENSE ALERTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_license_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  days_remaining integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.company_license_alerts IS 'Alertas de expiração de licença criados pelo Super Admin para uma empresa';
COMMENT ON COLUMN public.company_license_alerts.days_remaining IS 'Dias restantes até expirar (contagem regressiva)';
COMMENT ON COLUMN public.company_license_alerts.is_active IS 'Se o alerta está ativo (mostrado no banner/sino)';

CREATE INDEX IF NOT EXISTS idx_company_license_alerts_company ON public.company_license_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_license_alerts_active ON public.company_license_alerts(is_active);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.company_license_alerts ENABLE ROW LEVEL SECURITY;

-- Super Admin: acesso total (criar/editar/eliminar alertas para qualquer empresa)
DROP POLICY IF EXISTS "license_alerts super_admin full access" ON public.company_license_alerts;
CREATE POLICY "license_alerts super_admin full access" ON public.company_license_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Utilizadores da empresa: podem LER apenas os alertas da sua própria empresa
DROP POLICY IF EXISTS "license_alerts company read own" ON public.company_license_alerts;
CREATE POLICY "license_alerts company read own" ON public.company_license_alerts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role full access license_alerts" ON public.company_license_alerts;
CREATE POLICY "service_role full access license_alerts" ON public.company_license_alerts
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
