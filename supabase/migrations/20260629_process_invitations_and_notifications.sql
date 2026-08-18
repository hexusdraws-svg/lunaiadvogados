-- Migration: 20260629_process_invitations_and_notifications.sql
-- Sistema de convites para colaboradores de processos

-- Criar tabela process_collaboration_invites (se não existir)
CREATE TABLE IF NOT EXISTS public.process_collaboration_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_professional uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invitation_type text NOT NULL DEFAULT 'process_collaboration' CHECK (invitation_type IN ('process_collaboration')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_process_collaboration_invites_process ON public.process_collaboration_invites(process_id);
CREATE INDEX IF NOT EXISTS idx_process_collaboration_invites_professional ON public.process_collaboration_invites(invited_professional);
CREATE INDEX IF NOT EXISTS idx_process_collaboration_invites_company ON public.process_collaboration_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_process_collaboration_invites_status ON public.process_collaboration_invites(status);

-- Activação de RLS
ALTER TABLE public.process_collaboration_invites ENABLE ROW LEVEL SECURITY;

-- Admin vê todos os convites da empresa
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

-- Profissional vê apenas os seus convites
DROP POLICY IF EXISTS "process_collaboration_invites_professional_read" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_professional_read" ON public.process_collaboration_invites
  FOR SELECT USING (invited_professional = auth.uid());

-- Profissional pode atualizar o seu próprio convite (aceitar/rejeitar)
DROP POLICY IF EXISTS "process_collaboration_invites_professional_update" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_professional_update" ON public.process_collaboration_invites
  FOR UPDATE USING (invited_professional = auth.uid());

-- Admin ou qualquer utilizador autenticado da empresa pode criar convites
-- Esta policy permite: admin, super_admin, lawyer, admin, ou professional da empresa
DROP POLICY IF EXISTS "process_collaboration_invites_insert" ON public.process_collaboration_invites;
CREATE POLICY "process_collaboration_invites_insert" ON public.process_collaboration_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          -- É admin da empresa
          p.role IN ('admin', 'super_admin')
          OR
          -- É advogado/profissional da empresa
          (p.professional_role IN ('lawyer', 'admin') AND p.company_id = company_id)
          OR
          -- É professional com company_id válido (inclui advogados sem professional_role)
          (p.role = 'professional' AND p.company_id = company_id)
        )
    )
  );

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role_full_process_collaboration_invites" ON public.process_collaboration_invites;
CREATE POLICY "service_role_full_process_collaboration_invites" ON public.process_collaboration_invites
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');