-- ============================================
-- MIGRATION: Plano B Simplificado - Profiles-based Invitations & Auth
-- Objetivo: Usar profiles como fonte de convites SEM coluna user_id
-- Mantendo profiles.id = auth.users.id como chave principal
-- ============================================

-- 1. Garantir coluna status em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Atualizar CHECK constraint para valores corretos (pending, active, suspended)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('pending', 'active', 'suspended'));

-- 2. Remover FK restritiva de profiles.id -> auth.users para permitir perfis pendentes com id temporário
-- (No signup, o profile pending é substituído por um novo profile com id = auth.user.id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Remover trigger handle_new_user e função associada
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Remover RPC create_profile_for_signup (não é mais necessário)
DROP FUNCTION IF EXISTS public.create_profile_for_signup(uuid, text, text, text, uuid);

-- 5. Ajustar RLS policies para o fluxo Plano B

-- Super Admin pode inserir perfis (criar pending ao criar empresa)
DROP POLICY IF EXISTS "profiles super_admin insert" ON public.profiles;
CREATE POLICY "profiles super_admin insert" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Qualquer pessoa pode ler perfis pending (validação pública no signup)
DROP POLICY IF EXISTS "profiles select pending signup" ON public.profiles;
CREATE POLICY "profiles select pending signup" ON public.profiles
  FOR SELECT USING (status = 'pending');

-- Utilizador autenticado pode ler o próprio perfil (id = auth user id)
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

-- Atualização: utilizador pode atualizar próprio perfil
-- Delete/Insert no signup é permitido via service_role ou pela lógica de substituição
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

-- Service role acesso total (para login/signup via server se necessário)
DROP POLICY IF EXISTS "service_role full access profiles" ON public.profiles;
CREATE POLICY "service_role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. RPC para ativar profile pending de forma atômica (DELETE + INSERT)
-- Substitui perfil pendente (id temporário) por perfil ativo (id = auth.user.id)
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
BEGIN
  -- 1. Ler dados do profile pending (valida que existe e está pendente)
  SELECT email, role, company_id INTO v_email, v_role, v_company_id
  FROM public.profiles
  WHERE id = pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile pendente não encontrado para id %', pending_id;
  END IF;

  -- 2. Deletar profile pending (seguro: nenhuma FK referencia profiles)
  DELETE FROM public.profiles WHERE id = pending_id;

  -- 3. Inserir profile definitivo com id = auth.user.id
  -- ON CONFLICT garante idempotência: se já existir (reexecução segura), atualiza
  INSERT INTO public.profiles (id, email, full_name, role, company_id, status)
  VALUES (auth_user_id, v_email, user_full_name, v_role, v_company_id, 'active')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    status = EXCLUDED.status,
    updated_at = now();

  -- 4. Marcar invitation como aceita (compatibilidade temporária)
  UPDATE public.invitations
  SET status = 'accepted', updated_at = now()
  WHERE email = v_email AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_profile(uuid, uuid, text) TO authenticated;

-- 8. Garantir coluna full_name (algumas migrations usam 'name')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
    UPDATE public.profiles SET full_name = name WHERE full_name IS NULL;
    ALTER TABLE public.profiles DROP COLUMN name;
  END IF;
END $$;

-- Adicionar full_name se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- 9. Índices recomendados
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
