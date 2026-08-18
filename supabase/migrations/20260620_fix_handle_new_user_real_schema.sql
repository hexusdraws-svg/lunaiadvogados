-- ============================================
-- TRIGGER handle_new_user - Compatível com schema REAL
-- Schema REAL da tabela profiles:
--   id (uuid), full_name (text), role (text), 
--   company_id (uuid), created_at, updated_at, email (text)
-- ============================================

-- Remover trigger antigo (que pode ter colunas erradas)
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar trigger correto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
BEGIN
  -- Extrair dos metadados enviados no signUp
  v_company_id := NEW.raw_user_meta_data->>'company_id';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'professional');
  
  -- DEBUG: Log para ver o que está a chegar
  RAISE LOG 'handle_new_user: id=%, email=%, company_id=%, role=%', 
    NEW.id, NEW.email, v_company_id, v_role;

  -- Inserir profile com COLUNAS REAIS
  INSERT INTO public.profiles (id, email, full_name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    company_id = COALESCE(EXCLUDED.company_id, profiles.company_id),
    updated_at = now();

  -- Marcar invitation como aceite (apenas para non-super_admin)
  IF v_company_id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted',
        updated_at = now()
    WHERE email = NEW.email AND status = 'pending';
    
    RAISE LOG 'handle_new_user: invitation marked accepted for %', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();