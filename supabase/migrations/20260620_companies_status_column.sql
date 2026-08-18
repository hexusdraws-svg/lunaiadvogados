-- Add status column to companies table for Super Admin management
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled'));

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Super Admin full access to companies
DROP POLICY IF EXISTS "super_admin full access companies" ON public.companies;
CREATE POLICY "super_admin full access companies" ON public.companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "service_role full access companies" ON public.companies;
CREATE POLICY "service_role full access companies" ON public.companies
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);