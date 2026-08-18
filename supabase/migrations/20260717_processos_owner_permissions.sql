-- ============================================================
-- Migration: 20260717_processos_owner_permissions.sql
-- Objetivo: garantir que apenas o RESPONSÁVEL (ou admin) pode
-- eliminar o processo, e que colaboradores NÃO podem alterar o
-- responsável, eliminar nem concluir o processo.
--
-- Regras (módulo operacional):
--   - Responsável: edita, conclui, elimina, altera responsável.
--   - Admin da empresa: gere tudo (mantido pelas policies *_admin).
--   - Colaboradores: apenas consultam/colaboram (sem UPDATE/DELETE
--     permitidos pelas policies abaixo).
-- ============================================================

-- DELETE: responsável OU admin da empresa
DROP POLICY IF EXISTS "processos_delete_owner_or_admin" ON public.processos;
CREATE POLICY "processos_delete_owner_or_admin" ON public.processos
  FOR DELETE USING (
    auth.uid() = public.processos.responsavel_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- UPDATE: responsável OU admin (mantém a regra de que colaboradores
-- não conseguem atualizar o processo).
DROP POLICY IF EXISTS "processos_update_owner_or_admin" ON public.processos;
CREATE POLICY "processos_update_owner_or_admin" ON public.processos
  FOR UPDATE USING (
    auth.uid() = public.processos.responsavel_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  )
  WITH CHECK (
    -- Apenas o responsável atual ou admin podem alterar o responsável.
    -- Colaboradores nunca conseguem mudar responsavel_id.
    (auth.uid() = public.processos.responsavel_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- Etapas: eliminar apenas responsável do processo OU admin.
DROP POLICY IF EXISTS "processo_etapas_delete_owner_or_admin" ON public.processo_etapas;
CREATE POLICY "processo_etapas_delete_owner_or_admin" ON public.processo_etapas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_etapas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
        )
    )
  );
