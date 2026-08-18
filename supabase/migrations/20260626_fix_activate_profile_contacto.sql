-- Migration: 20260626_fix_activate_profile_contacto.sql
-- Objetivo: Garantir que activate_profile copia professional_role E contacto

-- 1. Adicionar contacto em profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contacto text;

-- 2. Atualizar RPC activate_profile para incluir professional_role e contacto
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
  v_contacto text;
BEGIN
  -- 1. Ler dados do profile pending (valida que existe e está pendente)
  SELECT email, role, company_id, professional_role, contacto
    INTO v_email, v_role, v_company_id, v_professional_role, v_contacto
  FROM public.profiles
  WHERE id = pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile pendente não encontrado para id %', pending_id;
  END IF;

  -- 2. Deletar profile pending
  DELETE FROM public.profiles WHERE id = pending_id;

  -- 3. Inserir profile definitivo com id = auth.user.id
  INSERT INTO public.profiles (id, email, full_name, role, company_id, status, professional_role, contacto, avatar_url)
  VALUES (auth_user_id, v_email, user_full_name, v_role, v_company_id, 'active', v_professional_role, v_contacto, NULL)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    status = EXCLUDED.status,
    professional_role = EXCLUDED.professional_role,
    contacto = EXCLUDED.contacto,
    updated_at = now();

  -- 4. Marcar invitation como aceita (compatibilidade)
  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE email = v_email AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_profile(uuid, uuid, text) TO authenticated;
