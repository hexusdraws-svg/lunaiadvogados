-- Migration: 20260720_company_subscriptions.sql
-- Objetivo: Financeiro do Super Admin — controlar assinaturas/plano de cada empresa.
-- Não altera RLS existente, autenticação, multi-tenant.

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basic',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','quarterly','semiannual','annual')),
  payment_method text,
  start_date date NOT NULL DEFAULT now(),
  next_due_date date NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','cancelled')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.company_subscriptions IS 'Assinaturas/plano financeiro de cada empresa para o Super Admin';
COMMENT ON COLUMN public.company_subscriptions.frequency IS 'Frequência: monthly, quarterly, semiannual, annual';
COMMENT ON COLUMN public.company_subscriptions.status IS 'Status: paid, pending, cancelled';

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_next_due ON public.company_subscriptions(next_due_date);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions super_admin full access" ON public.company_subscriptions;
CREATE POLICY "subscriptions super_admin full access" ON public.company_subscriptions
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

DROP POLICY IF EXISTS "service_role full access subscriptions" ON public.company_subscriptions;
CREATE POLICY "service_role full access subscriptions" ON public.company_subscriptions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
