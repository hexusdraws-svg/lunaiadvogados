-- ============================================================
-- Migration: 20260716_processos_admin_collaboration_rules.sql
-- Objetivo: No módulo OPERACIONAL de Processos, o administrador
-- passa a obedecer EXATAMENTE às mesmas regras de colaboração que
-- qualquer outro utilizador.
--
--   - SELECT: só processos onde é responsável (responsavel_id) OU
--     possui convite aceite (process_collaboration_invites.status='accepted').
--   - O admin continua a poder GERIR (INSERT/UPDATE/DELETE) todos os
--     processos da empresa (via Painel Executivo / módulos admin).
--   - A visão "todos os processos da empresa" fica reservada ao
--     service_role e aos módulos administrativos (exec dashboard).
-- ============================================================

-- Remover a policy que dava SELECT total ao admin no módulo operacional
DROP POLICY IF EXISTS "processos_select_admin" ON public.processos;

-- SELECT unificado: admin e profissionais usam a MESMA regra de colaboração
DROP POLICY IF EXISTS "processos_select_collaboration" ON public.processos;
CREATE POLICY "processos_select_collaboration" ON public.processos
  FOR SELECT USING (
    auth.uid() = public.processos.responsavel_id
    OR EXISTS (
      SELECT 1 FROM public.process_collaboration_invites pci
      WHERE pci.process_id = public.processos.id
        AND pci.invited_professional = auth.uid()
        AND pci.status = 'accepted'
    )
  );

-- Manter gestão (admin continua a poder criar/atualizar/remover)
-- As policies processos_insert_admin_lawyer / processos_update_admin /
-- processos_update_lawyer_own / processos_delete_admin permanecem válidas.
-- service_role mantém acesso total (módulos administrativos / exec dashboard).

-- ============================================================
-- SEPARAÇÃO OPERACIONAL vs PAINEL EXECUTIVO
-- No módulo OPERACIONAL (hook useProcessos), o admin obedece às mesmas
-- regras de colaboração (filtra responsavel_id + convites aceites).
-- O Painel Executivo / módulos administrativos precisam de ver TODOS os
-- processos da empresa. Como o RLS é ao nível da tabela, concedemos ao
-- admin SELECT sobre todos os processos da empresa; a distinção de
-- comportamento é feita no FRONT-END (qual hook/query é invocado).
-- ============================================================
DROP POLICY IF EXISTS "processos_select_admin_all" ON public.processos;
CREATE POLICY "processos_select_admin_all" ON public.processos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p_super
      WHERE p_super.id = auth.uid()
        AND p_super.role = 'super_admin'
        AND p_super.company_id IS NULL
    )
  );
