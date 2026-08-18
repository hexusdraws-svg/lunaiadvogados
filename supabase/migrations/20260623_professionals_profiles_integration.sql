-- Migration: 20260623_professionals_profiles_integration.sql
-- Objetivo: Migrar gestão de profissionais para tabela profiles usando o fluxo de convites existente

-- =========================================================
-- 1. NOVO ENUM para função/cargo profissional
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_role') THEN
    CREATE TYPE professional_role AS ENUM ('admin', 'lawyer', 'receptionist', 'secretary');
  END IF;
END $$;

-- =========================================================
-- 2. ADICIONAR coluna professional_role em profiles
-- =========================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS professional_role professional_role;

CREATE INDEX IF NOT EXISTS idx_profiles_professional_role ON public.profiles(professional_role);

-- =========================================================
-- 3. MODIFICAR RPC activate_profile para incluir professional_role
-- =========================================================
CREATE OR REPLACE FUNCTION public.activate_profile(
  pending_id uuid,
  auth_user_id uuid,
  user_full_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
  v_company_id uuid;
  v_professional_role professional_role;
BEGIN
  -- 1. Ler dados do profile pending (valida que existe e está pendente)
  SELECT email, role, company_id, professional_role INTO v_email, v_role, v_company_id, v_professional_role
  FROM public.profiles
  WHERE id = pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile pendente não encontrado para id %', pending_id;
  END IF;

  -- 2. Deletar profile pending
  DELETE FROM public.profiles WHERE id = pending_id;

  -- 3. Inserir profile definitivo com id = auth.user.id
  INSERT INTO public.profiles (id, email, full_name, role, company_id, status, professional_role)
  VALUES (auth_user_id, v_email, user_full_name, v_role, v_company_id, 'active', v_professional_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    status = EXCLUDED.status,
    professional_role = EXCLUDED.professional_role,
    updated_at = now();

  -- 4. Marcar invitation como aceita
  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE email = v_email AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_profile(uuid, uuid, text) TO authenticated;

-- =========================================================
-- 4. RLS POLICIES - Professions/Profissionais agora em profiles
-- =========================================================

-- Qualquer pessoa pode ler perfis pending (validação pública no signup)
DROP POLICY IF EXISTS "profiles select pending signup" ON public.profiles;
CREATE POLICY "profiles select pending signup" ON public.profiles
  FOR SELECT USING (status = 'pending');

-- Utilizador autenticado pode ler o próprio perfil
DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Super Admin pode ler todos os perfis
DROP POLICY IF EXISTS "profiles super_admin read all" ON public.profiles;
CREATE POLICY "profiles super_admin read all" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ADMIN pode ler perfis da própria empresa (inclui pending e active)
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

-- Super Admin pode inserir perfis (criar pending ao criar empresa)
DROP POLICY IF EXISTS "profiles super_admin insert" ON public.profiles;
CREATE POLICY "profiles super_admin insert" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ADMIN pode inserir perfis pending da própria empresa
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

-- Atualização: utilizador pode atualizar próprio perfil
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super Admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS "profiles super_admin write all" ON public.profiles;
CREATE POLICY "profiles super_admin write all" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ADMIN pode atualizar perfis da própria empresa
DROP POLICY IF EXISTS "profiles admin update company" ON public.profiles;
CREATE POLICY "profiles admin update company" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid() 
        AND p_admin.role = 'admin'
        AND p_admin.company_id = public.profiles.company_id
    )
  );

-- Service role acesso total
DROP POLICY IF EXISTS "service_role full access profiles" ON public.profiles;
CREATE POLICY "service_role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- 5. REMOVER tabela profissionais (DEPOIS de migrar dados, se necessário)
-- =========================================================
-- Nota: A tabela profissionais é mantida por enquanto para compatibilidade com dados existentes.
-- A aplicação foi migrada para usar profiles. Quando todos os dados estiverem migrados,
-- executar: DROP TABLE IF EXISTS public.profissionais CASCADE;
