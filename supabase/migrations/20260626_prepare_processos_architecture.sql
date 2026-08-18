-- Migration: 20260626_prepare_processos_architecture.sql
-- Objetivo: Preparar arquitetura para processos jurídicos com responsável

-- 1. Adicionar responsavel_id em processos (advogado responsável)
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_processos_responsavel ON public.processos(responsavel_id);

-- 3. Atualizar RLS policies para processos (se existirem)
-- Admin vê todos os processos da empresa
DROP POLICY IF EXISTS "processos admin read company" ON public.processos;
CREATE POLICY "processos admin read company" ON public.processos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- Advogado vê processos onde é responsável OU tem convite aceito em process_collaboration_invites
DROP POLICY IF EXISTS "processos_lawyer_read_own" ON public.processos;
CREATE POLICY "processos_lawyer_read_own" ON public.processos
  FOR SELECT USING (
    auth.uid() = responsavel_id
    OR EXISTS (
      SELECT 1 FROM public.process_collaboration_invites pci
      WHERE pci.process_id = public.processos.id
        AND pci.invited_professional = auth.uid()
        AND pci.status = 'accepted'
    )
  );

-- Admin pode atualizar/remover processos da empresa
DROP POLICY IF EXISTS "processos admin write company" ON public.processos;
CREATE POLICY "processos admin write company" ON public.processos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- Admin OU Advogado (lawyer) podem criar processos
DROP POLICY IF EXISTS "processos lawyer create" ON public.processos;
CREATE POLICY "processos lawyer create" ON public.processos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('admin', 'super_admin')
          OR p.professional_role IN ('lawyer', 'admin')
        )
        AND p.company_id = company_id
    )
  );

-- Admin pode remover processos da empresa
DROP POLICY IF EXISTS "processos admin delete company" ON public.processos;
CREATE POLICY "processos admin delete company" ON public.processos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.processos.company_id
    )
  );

-- Advogado pode atualizar apenas processos onde é responsável
DROP POLICY IF EXISTS "processos lawyer update own" ON public.processos;
CREATE POLICY "processos lawyer update own" ON public.processos
  FOR UPDATE USING (auth.uid() = responsavel_id);
