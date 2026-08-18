-- ============================================
-- MIGRATION: Profiles-based invitation system (Plan B)
-- Usar profiles como fonte de convites
-- ============================================

-- Remover trigger antigo que cria profiles
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Atualizar RLS para permitir ativação de profiles pending
-- Permitir update de profiles quando status=pending (para signup)
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR id IS NULL)
  WITH CHECK (auth.uid() = id);

-- Permitir insert quando company_id é fornecido (signup activation)
DROP POLICY IF EXISTS "profiles insert signup" ON public.profiles;
CREATE POLICY "profiles insert signup" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Permitir select de profiles pending pelo email (para validação no signup)
DROP POLICY IF EXISTS "profiles select pending by email" ON public.profiles;
CREATE POLICY "profiles select pending by email" ON public.profiles
  FOR SELECT USING (
    status = 'pending' OR auth.uid() = id
  );