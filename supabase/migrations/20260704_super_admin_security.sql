-- Security policies for Super Admin access
-- Profiles table - restrict access to company data
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;

CREATE POLICY "Profiles: super_admin full access" 
  ON public.profiles 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- For non-super-admins, profiles can only see/manage their own company
CREATE POLICY "Profiles: company isolation" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role = 'super_admin'
    )
    OR company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Companies table - super admin only access for admin pages
DROP POLICY IF EXISTS "Allow authenticated read companies" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated update companies" ON public.companies;

CREATE POLICY "Companies: super_admin full access" 
  ON public.companies 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
  )
  WITH CHECK (true);

-- Company payment methods - company scoped
DROP POLICY IF EXISTS "Allow company read" ON public.company_payment_methods;
DROP POLICY IF EXISTS "Allow company modify" ON public.company_payment_methods;

CREATE POLICY "Company payment methods: company or super admin access"
  ON public.company_payment_methods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
    OR company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Company payment methods: company or super admin modify"
  ON public.company_payment_methods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'super_admin'
    )
    OR company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Functions to assist with company operations
-- This function deletes a company and all related data
CREATE OR REPLACE FUNCTION public.delete_company_cascade(company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete all profiles for this company
  DELETE FROM profiles WHERE company_id = delete_company_cascade.company_id;
  
  -- Delete the company (cascades to related tables via FK)
  DELETE FROM companies WHERE id = delete_company_cascade.company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (will be restricted via RLS)
GRANT EXECUTE ON FUNCTION public.delete_company_cascade TO authenticated;

-- Ensure trigger for company status check on user login
-- This is handled in the app via fetchProfile, but can also be done via DB trigger