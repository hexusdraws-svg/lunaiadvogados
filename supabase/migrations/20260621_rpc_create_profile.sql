-- ============================================
-- RPC create_profile_for_signup - Substitui o trigger
-- Permite criar profile após signup sem depender do trigger
-- SECURITY DEFINER para bypass RLS
-- ============================================

CREATE OR REPLACE FUNCTION public.create_profile_for_signup(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_role text,
  company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir profile com todos os campos necessários
  INSERT INTO public.profiles (id, email, full_name, role, company_id)
  VALUES (
    user_id,
    user_email,
    user_full_name,
    user_role,
    company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    updated_at = now();

  -- Marcar invitation como aceite
  IF company_id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted',
        updated_at = now()
    WHERE email = user_email AND status = 'pending';
  END IF;
END;
$$;

-- Conceder permissão para utilizadores autenticados
GRANT EXECUTE ON FUNCTION public.create_profile_for_signup TO authenticated;