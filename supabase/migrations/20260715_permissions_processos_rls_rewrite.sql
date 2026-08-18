-- ============================================================
-- Migration: 20260715_permissions_processos_rls_rewrite.sql
-- Objetivo: Reescrever completamente as RLS de processos para
-- aplicar a arquitetura de roles (role + professional_role).
--
-- Spec de visibilidade de PROCESSOS:
--   - Admin (role = admin | super_admin): vê TUDO da empresa.
--   - Lawyer (professional_role = lawyer): vê processos próprios
--       (responsavel_id = auth.uid()) + processos com convite aceite.
--   - Secretary / Receptionist / Paralegal: NÃO vê processos.
--
-- Escrita (INSERT/UPDATE/DELETE):
--   - Admin: gere todos os processos da empresa.
--   - Lawyer: pode criar e editar processos onde é responsável.
--   - Secretary/Receptionist: não podem criar/alterar processos.
--
-- NOTA: As policies de SELECT antigas "public read processos USING (true)"
-- tornavam a tabela totalmente aberta (OR semantics do RLS). São
-- removidas nesta migration para que as regras restritivas vigorem.
-- ============================================================

-- 1. Remover TODAS as policies antigas de processos (permissivas e restritivas)
DROP POLICY IF EXISTS "public read processos" ON public.processos;
DROP POLICY IF EXISTS "public write processos" ON public.processos;
DROP POLICY IF EXISTS "public update processos" ON public.processos;
DROP POLICY IF EXISTS "public delete processos" ON public.processos;
DROP POLICY IF EXISTS "processos admin read company" ON public.processos;
DROP POLICY IF EXISTS "processos_lawyer_read_own" ON public.processos;
DROP POLICY IF EXISTS "processos admin write company" ON public.processos;
DROP POLICY IF EXISTS "processos lawyer create" ON public.processos;
DROP POLICY IF EXISTS "processos admin delete company" ON public.processos;
DROP POLICY IF EXISTS "processos lawyer update own" ON public.processos;

-- Garantir RLS ativo
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: Admin (role) vê todos os processos da empresa
DROP POLICY IF EXISTS "processos_select_admin" ON public.processos;
CREATE POLICY "processos_select_admin" ON public.processos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- 3. SELECT: Lawyer vê processos próprios + convites aceites
DROP POLICY IF EXISTS "processos_select_lawyer" ON public.processos;
CREATE POLICY "processos_select_lawyer" ON public.processos
  FOR SELECT USING (
    auth.uid() = public.processos.responsavel_id
    OR EXISTS (
      SELECT 1 FROM public.process_collaboration_invites pci
      WHERE pci.process_id = public.processos.id
        AND pci.invited_professional = auth.uid()
        AND pci.status = 'accepted'
    )
  );

-- 4. INSERT: Admin ou Lawyer (da mesma empresa) podem criar
DROP POLICY IF EXISTS "processos_insert_admin_lawyer" ON public.processos;
CREATE POLICY "processos_insert_admin_lawyer" ON public.processos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.processos.company_id
        AND (
          p.role IN ('admin', 'super_admin')
          OR p.professional_role = 'lawyer'
        )
    )
  );

-- 5. UPDATE: Admin (empresa) ou Lawyer responsável
DROP POLICY IF EXISTS "processos_update_admin" ON public.processos;
CREATE POLICY "processos_update_admin" ON public.processos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

DROP POLICY IF EXISTS "processos_update_lawyer_own" ON public.processos;
CREATE POLICY "processos_update_lawyer_own" ON public.processos
  FOR UPDATE USING (auth.uid() = public.processos.responsavel_id)
  WITH CHECK (auth.uid() = public.processos.responsavel_id);

-- 6. DELETE: Apenas Admin da empresa
DROP POLICY IF EXISTS "processos_delete_admin" ON public.processos;
CREATE POLICY "processos_delete_admin" ON public.processos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- 7. Service role: acesso total (usado por triggers/edge functions)
DROP POLICY IF EXISTS "service_role_full_processos" ON public.processos;
CREATE POLICY "service_role_full_processos" ON public.processos
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- RLS de process_collaboration_invites (reforçar, manter consistência)
-- ============================================================
DROP POLICY IF EXISTS "process_collaboration_invites_admin_read" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_admin_read" ON public.process_collaboration_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.process_collaboration_invites.company_id
    )
  );

DROP POLICY IF EXISTS "process_collaboration_invites_professional_read" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_professional_read" ON public.process_collaboration_invites
  FOR SELECT USING (invited_professional = auth.uid());

DROP POLICY IF EXISTS "process_collaboration_invites_professional_update" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_professional_update" ON public.process_collaboration_invites
  FOR UPDATE USING (invited_professional = auth.uid())
  WITH CHECK (invited_professional = auth.uid());

DROP POLICY IF EXISTS "process_collaboration_invites_insert" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_insert" ON public.process_collaboration_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.process_collaboration_invites.company_id
        AND (
          p.role IN ('admin', 'super_admin')
          OR p.professional_role = 'lawyer'
        )
    )
  );

DROP POLICY IF EXISTS "service_role_full_process_collaboration_invites" ON public.process_collaboration_invites;
CREATE POLICY "service_role_full_process_collaboration_invites" ON public.process_collaboration_invites
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- TRIGGER: ao criar um convite de colaboração, gera uma
-- notificação persistente para o utilizador convidado.
-- Isto garante que o sino atualiza automaticamente (via realtime
-- na tabela notifications) independentemente da aba aberta.
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_process_collaboration_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_numero text;
BEGIN
  -- Obter company_id e número do processo
  SELECT p.company_id, p.numero
    INTO v_company_id, v_numero
    FROM public.processos p
   WHERE p.id = NEW.process_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    company_id,
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_company_id,
    NEW.invited_professional,
    'Convite de colaboração',
    COALESCE(NEW.message, 'Foi convidado para colaborar no processo ' || COALESCE(v_numero, '')) || '.',
    'info',
    'case',
    NEW.process_id,
    jsonb_build_object('invitation_id', NEW.id, 'process_id', NEW.process_id, 'numero', v_numero)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_process_collaboration_invite
  ON public.process_collaboration_invites;
CREATE TRIGGER trg_notify_process_collaboration_invite
  AFTER INSERT ON public.process_collaboration_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_process_collaboration_invite();

GRANT EXECUTE ON FUNCTION public.notify_process_collaboration_invite() TO authenticated;
