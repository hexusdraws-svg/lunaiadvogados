-- Migration: 20260625_roles_permissions_profile_system.sql
-- Objetivo: Implementar sistema completo de cargos, permissões, perfis e gestão de utilizadores

-- =========================================================
-- 1. ADICIONAR avatar_url em profiles
-- =========================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- =========================================================
-- 2. ADICIONAR website em companies
-- =========================================================
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS website text;

-- =========================================================
-- 3. EXPANDIR ENUM professional_role
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_role') THEN
    CREATE TYPE professional_role AS ENUM ('admin', 'lawyer', 'receptionist', 'secretary', 'manager', 'intern', 'other');
  ELSE
    -- Adicionar valores em falta se não existirem
    BEGIN
      ALTER TYPE professional_role ADD VALUE 'manager';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE professional_role ADD VALUE 'intern';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE professional_role ADD VALUE 'other';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- =========================================================
-- 4. ATUALIZAR activate_profile para incluir professional_role expandido
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
  SELECT email, role, company_id, professional_role INTO v_email, v_role, v_company_id, v_professional_role
  FROM public.profiles
  WHERE id = pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile pendente não encontrado para id %', pending_id;
  END IF;

  DELETE FROM public.profiles WHERE id = pending_id;

  INSERT INTO public.profiles (id, email, full_name, role, company_id, status, professional_role, avatar_url)
  VALUES (auth_user_id, v_email, user_full_name, v_role, v_company_id, 'active', v_professional_role, NULL)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    status = EXCLUDED.status,
    professional_role = EXCLUDED.professional_role,
    updated_at = now();

  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE email = v_email AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_profile(uuid, uuid, text) TO authenticated;

-- =========================================================
-- 5. RPC para soft delete de utilizadores (manter dados, marcar inativo)
-- =========================================================
CREATE OR REPLACE FUNCTION public.deactivate_user(
  p_user_id uuid,
  p_remover_avatar boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avatar_url text;
BEGIN
  -- Obter avatar_url antes de desativar
  SELECT avatar_url INTO v_avatar_url FROM public.profiles WHERE id = p_user_id;

  -- Marcar como inativo (não deletar para preservar dados/auditoria)
  UPDATE public.profiles
  SET status = 'inactive',
      updated_at = now()
  WHERE id = p_user_id;

  -- Remover avatar do storage se existir
  IF p_remover_avatar AND v_avatar_url IS NOT NULL THEN
    -- Extrair caminho da URL (assumindo formato padrão do Supabase Storage)
    -- O frontend já remove o ficheiro; aqui garantimos cleanup se necessário
    NULL; -- Delegação ao frontend via storage delete
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid, boolean) TO authenticated;
