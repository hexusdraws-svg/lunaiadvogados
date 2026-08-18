-- Fix super_admin RLS policies to prevent timeout and security issues
-- The previous "Profiles: super_admin full access" policy used USING (true),
-- which effectively disabled RLS for all users and could cause unexpected behavior.
-- This migration corrects the policies to properly restrict access.

-- Fix super_admin full access policy to actually check role
DROP POLICY IF EXISTS "Profiles: super_admin full access" ON public.profiles;

CREATE POLICY "Profiles: super_admin full access"
  ON public.profiles
  FOR ALL
  USING (
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

-- Fix company isolation policy to avoid self-referential subquery issues
-- and ensure super_admin can always read their own profile
DROP POLICY IF EXISTS "Profiles: company isolation" ON public.profiles;

CREATE POLICY "Profiles: company isolation"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Ensure super_admin read all policy is correct
DROP POLICY IF EXISTS "profiles super_admin read all" ON public.profiles;

CREATE POLICY "profiles super_admin read all"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Ensure super_admin write all policy is correct
DROP POLICY IF EXISTS "profiles super_admin write all" ON public.profiles;

CREATE POLICY "profiles super_admin write all"
  ON public.profiles
  FOR ALL
  USING (
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
