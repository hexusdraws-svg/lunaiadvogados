-- Company Internationalization
-- Migration: 20260704_company_internationalization.sql

-- =========================================================
-- 1. COMPANIES - internationalization fields
-- =========================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Lisbon',
  ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'dd/MM/yyyy';

-- =========================================================
-- 2. COMPANY_PAYMENT_METHODS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  method_key text NOT NULL,
  method_label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read payment methods" ON public.company_payment_methods FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public insert payment methods" ON public.company_payment_methods FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow public update payment methods" ON public.company_payment_methods FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Allow public delete payment methods" ON public.company_payment_methods FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company ON public.company_payment_methods(company_id);
