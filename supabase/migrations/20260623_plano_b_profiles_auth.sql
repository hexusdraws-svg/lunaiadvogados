-- ============================================
-- MIGRATION: Plano B - Profiles-based Invitations & Auth
-- Objetivo: Usar profiles como fonte de convites,
-- removendo dependência da tabela invitations e trigger handle_new_user
-- ============================================

-- 1. Garantir coluna status em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Atualizar CHECK constraint para valores corretos (pending, active, suspended)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('pending', 'active', 'suspended'));

-- 2. Remover FK restritiva de profiles.id -> auth.users para permitir perfis pendentes sem auth user
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Adicionar coluna user_id para vincular ao auth.user após signup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id uuid;

-- 4. Adicionar FK e unique constraint em user_id
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 5. Remover trigger handle_new_user e função associada
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. Remover RPC create_profile_for_signup (não é mais necessário)
DROP FUNCTION IF EXISTS public.create_profile_for_signup(uuid, text, text, text, uuid);

-- 7. Ajustar RLS policies para o fluxo Plano B

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
  FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);

-- Super Admin pode ler todos os perfis
DROP POLICY IF EXISTS "profiles super_admin read all" ON public.profiles;
CREATE POLICY "profiles super_admin read all" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Atualização: utilizador pode atualizar próprio perfil (id ou user_id)
-- Também permite atualizar perfis pending durante a ativação no signup
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    auth.uid() = user_id OR
    (status = 'pending' AND auth.uid() IS NOT NULL)
  )
  WITH CHECK (
    auth.uid() = id OR
    auth.uid() = user_id
  );

-- Super Admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS "profiles super_admin write all" ON public.profiles;
CREATE POLICY "profiles super_admin write all" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Service role acesso total
DROP POLICY IF EXISTS "service_role full access profiles" ON public.profiles;
CREATE POLICY "service_role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
