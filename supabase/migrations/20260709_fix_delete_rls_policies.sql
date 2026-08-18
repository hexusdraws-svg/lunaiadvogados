-- Fix missing DELETE RLS policies for delete operations

-- Clientes: permitir DELETE para usuários autenticados
CREATE POLICY IF NOT EXISTS "public delete clientes"
  ON public.clientes
  FOR DELETE
  USING (true);

-- Profiles: permitir DELETE para admins e super_admins da mesma empresa
CREATE POLICY IF NOT EXISTS "profiles admin delete company"
  ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = profiles.company_id
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Processo_historico: permitir DELETE para usuários autenticados
CREATE POLICY IF NOT EXISTS "public delete processo_historico"
  ON public.processo_historico
  FOR DELETE
  USING (true);
