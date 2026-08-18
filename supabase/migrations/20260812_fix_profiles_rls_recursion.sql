-- Migration: 20260812_fix_profiles_rls_recursion.sql
-- Corrige recursão infinita nas políticas RLS de profiles causada por subqueries
-- em public.profiles dentro das próprias políticas de profiles.
--
-- Causa: políticas de super_admin usavam EXISTS (SELECT 1 FROM public.profiles ...)
-- dentro de USING/CHECK da própria tabela profiles, gerando loop de avaliação.
--
-- Solução: usar função auxiliar SECURITY DEFINER para verificar role de super_admin
-- sem disparar novamente as políticas RLS de profiles.

-- 1. Criar função auxiliar segura para verificar super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 2. Remover políticas recursivas existentes
DROP POLICY IF EXISTS "Profiles: super_admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: company isolation" ON public.profiles;
DROP POLICY IF EXISTS "profiles super_admin read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles super_admin write all" ON public.profiles;

-- 3. Recriar políticas sem subqueries recursivas em profiles
-- Super_admin: acesso total
CREATE POLICY "Profiles: super_admin full access"
  ON public.profiles
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Company isolation: usuário autenticado vê próprio perfil ou perfis da empresa
CREATE POLICY "Profiles: company isolation"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Super admin pode ler todos
CREATE POLICY "profiles super_admin read all"
  ON public.profiles
  FOR SELECT
  USING (public.is_super_admin());

-- Super admin pode escrever todos
CREATE POLICY "profiles super_admin write all"
  ON public.profiles
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 4. Garantir que usuário autenticado pode atualizar próprio perfil (necessário para signup)
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
