-- ============================================================
-- Migration: 20260721_fix_hearings_rls_for_super_admin.sql
-- Objetivo: Permitir que super_admin com company_id NULL aceda
-- a todas as audiências, resolvendo HTTPError 500 no dashboard.
-- ============================================================

-- SELECT: admin/super_admin da empresa OU super_admin global (company_id IS NULL)
DROP POLICY IF EXISTS "hearings admin read company" ON public.hearings;
CREATE POLICY "hearings admin read company" ON public.hearings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  );

-- INSERT: admin/super_admin da empresa OU super_admin global
DROP POLICY IF EXISTS "hearings admin insert company" ON public.hearings;
CREATE POLICY "hearings admin insert company" ON public.hearings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  );

-- UPDATE: admin/super_admin da empresa OU super_admin global
DROP POLICY IF EXISTS "hearings admin update company" ON public.hearings;
CREATE POLICY "hearings admin update company" ON public.hearings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  );

-- DELETE: admin/super_admin da empresa OU super_admin global
DROP POLICY IF EXISTS "hearings admin delete company" ON public.hearings;
CREATE POLICY "hearings admin delete company" ON public.hearings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  );
