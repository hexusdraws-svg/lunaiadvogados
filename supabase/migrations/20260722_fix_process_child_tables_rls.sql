-- ============================================================
-- Migration: 20260722_fix_process_child_tables_rls.sql
-- Objetivo: corrigir vazamento de dados em tabelas filhas de
-- processo (etapas, tarefas, documentos, historico).
--
-- Problema anterior:
--   As policies "public read ..." permitiam SELECT para qualquer
--   utilizador autenticado, independentemente de pertencer ao
--   processo.
--
-- Nova regra unificada:
--   - Admin/Super Admin da empresa: acesso total.
--   - Responsável pelo processo: acesso total.
--   - Colaborador com convite aceite: acesso total.
--   - Service role: acesso total.
-- ============================================================

-- ============================================================
-- processo_etapas
-- ============================================================
DROP POLICY IF EXISTS "public read processo_etapas" ON public.processo_etapas;
DROP POLICY IF EXISTS "public write processo_etapas" ON public.processo_etapas;
DROP POLICY IF EXISTS "public update processo_etapas" ON public.processo_etapas;
DROP POLICY IF EXISTS "public delete processo_etapas" ON public.processo_etapas;
DROP POLICY IF EXISTS "processo_etapas_delete_owner_or_admin" ON public.processo_etapas;

CREATE POLICY "processo_etapas_select_access" ON public.processo_etapas
  FOR SELECT USING (
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
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_etapas_insert_access" ON public.processo_etapas
  FOR INSERT WITH CHECK (
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
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_etapas_update_access" ON public.processo_etapas
  FOR UPDATE USING (
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
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
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
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_etapas_delete_access" ON public.processo_etapas
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
    OR auth.role() = 'service_role'
  );

-- ============================================================
-- processo_tarefas
-- ============================================================
DROP POLICY IF EXISTS "public read processo_tarefas" ON public.processo_tarefas;
DROP POLICY IF EXISTS "public write processo_tarefas" ON public.processo_tarefas;
DROP POLICY IF EXISTS "public update processo_tarefas" ON public.processo_tarefas;
DROP POLICY IF EXISTS "public delete processo_tarefas" ON public.processo_tarefas;

CREATE POLICY "processo_tarefas_select_access" ON public.processo_tarefas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_tarefas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_tarefas_insert_access" ON public.processo_tarefas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_tarefas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_tarefas_update_access" ON public.processo_tarefas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_tarefas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_tarefas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_tarefas_delete_access" ON public.processo_tarefas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_tarefas.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================
-- processo_documentos
-- ============================================================
DROP POLICY IF EXISTS "public read processo_documentos" ON public.processo_documentos;
DROP POLICY IF EXISTS "public write processo_documentos" ON public.processo_documentos;
DROP POLICY IF EXISTS "public delete processo_documentos" ON public.processo_documentos;

CREATE POLICY "processo_documentos_select_access" ON public.processo_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_documentos.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_documentos_insert_access" ON public.processo_documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_documentos.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_documentos_update_access" ON public.processo_documentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_documentos.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_documentos.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_documentos_delete_access" ON public.processo_documentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_documentos.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

-- ============================================================
-- processo_historico
-- ============================================================
DROP POLICY IF EXISTS "public read processo_historico" ON public.processo_historico;
DROP POLICY IF EXISTS "public write processo_historico" ON public.processo_historico;
DROP POLICY IF EXISTS "public delete processo_historico" ON public.processo_historico;

CREATE POLICY "processo_historico_select_access" ON public.processo_historico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_historico.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_historico_insert_access" ON public.processo_historico
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_historico.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_historico_update_access" ON public.processo_historico
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_historico.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_historico.processo_id
        AND (
          p.responsavel_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pa
            WHERE pa.id = auth.uid()
              AND pa.role IN ('admin', 'super_admin')
              AND pa.company_id = p.company_id
          )
          OR EXISTS (
            SELECT 1 FROM public.process_collaboration_invites pci
            WHERE pci.process_id = p.id
              AND pci.invited_professional = auth.uid()
              AND pci.status = 'accepted'
          )
        )
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "processo_historico_delete_access" ON public.processo_historico
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.processo_historico.processo_id
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
    OR auth.role() = 'service_role'
  );
