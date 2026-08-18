-- Migration: 20260626_fix_profiles_rls_read.sql
-- Objetivo: Corrigir RLS para permitir que administradores E profissionais
-- leiam todos os perfis da mesma empresa, e garantir políticas de atualização

-- =========================================================
-- 1. SELECT: Admin pode ler todos os perfis da mesma empresa
-- =========================================================
DROP POLICY IF EXISTS "profiles admin read company" ON public.profiles;
CREATE POLICY "profiles admin read company" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role = 'admin'
        AND p_admin.company_id = public.profiles.company_id
    )
  );

-- =========================================================
-- 2. SELECT: Profissional pode ler todos os perfis da mesma empresa (apenas visualização)
-- =========================================================
DROP POLICY IF EXISTS "profiles professional read company" ON public.profiles;
CREATE POLICY "profiles professional read company" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_prof
      WHERE p_prof.id = auth.uid()
        AND p_prof.role = 'professional'
        AND p_prof.company_id = public.profiles.company_id
    )
  );

-- =========================================================
-- 3. SELECT: Utilizador pode ler o próprio perfil
-- =========================================================
DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- =========================================================
-- 4. UPDATE: Admin pode atualizar perfis da mesma empresa
-- =========================================================
DROP POLICY IF EXISTS "profiles admin update company" ON public.profiles;
CREATE POLICY "profiles admin update company" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role = 'admin'
        AND p_admin.company_id = public.profiles.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role = 'admin'
        AND p_admin.company_id = public.profiles.company_id
    )
  );

-- =========================================================
-- 5. INSERT: Admin pode inserir pending na mesma empresa
-- =========================================================
DROP POLICY IF EXISTS "profiles admin insert company_pending" ON public.profiles;
CREATE POLICY "profiles admin insert company_pending" ON public.profiles
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role = 'admin'
        AND p_admin.company_id = public.profiles.company_id
    )
  );

-- =========================================================
-- 6. Super Admin: ler/atualizar qualquer perfil
-- =========================================================
DROP POLICY IF EXISTS "profiles super_admin read all" ON public.profiles;
CREATE POLICY "profiles super_admin read all" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "profiles super_admin write all" ON public.profiles;
CREATE POLICY "profiles super_admin write all" ON public.profiles
  FOR UPDATE USING (
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

-- =========================================================
-- 7. Service role: acesso total
-- =========================================================
DROP POLICY IF EXISTS "service_role full access profiles" ON public.profiles;
CREATE POLICY "service_role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
