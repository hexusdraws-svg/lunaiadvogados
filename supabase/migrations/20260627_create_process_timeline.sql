-- Migration: 20260627_create_process_timeline.sql
-- Objetivo: Criar tabela de histórico/timeline de eventos de processos
-- Nota: Esta tabela é IMUTÁVEL - apenas INSERT, sem UPDATE ou DELETE permitidos

-- =========================================================
-- 1. TABELA process_timeline
-- =========================================================
CREATE TABLE IF NOT EXISTS public.process_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.process_timeline IS 'Histórico permanente de eventos de processos (apenas INSERT, sem UPDATE/DELETE)';
COMMENT ON COLUMN public.process_timeline.event IS 'Tipo do evento (ex: created, updated, document_added, status_changed)';
COMMENT ON COLUMN public.process_timeline.description IS 'Descrição legível do evento';
COMMENT ON COLUMN public.process_timeline.metadata IS 'Dados adicionais em formato JSON (detalhes da alteração)';

-- =========================================================
-- 2. ÍNDICES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_process_timeline_case ON public.process_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_process_timeline_company ON public.process_timeline(company_id);
CREATE INDEX IF NOT EXISTS idx_process_timeline_user ON public.process_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_process_timeline_event ON public.process_timeline(event);
CREATE INDEX IF NOT EXISTS idx_process_timeline_created_at ON public.process_timeline(created_at);
CREATE INDEX IF NOT EXISTS idx_process_timeline_metadata ON public.process_timeline USING GIN(metadata);

-- =========================================================
-- 3. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.process_timeline ENABLE ROW LEVEL SECURITY;

-- Admin vê todo o histórico da empresa
DROP POLICY IF EXISTS "process_timeline admin read company" ON public.process_timeline;
CREATE POLICY "process_timeline admin read company" ON public.process_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.process_timeline.company_id
    )
  );

-- Advogado vê histórico de processos onde é responsável ou colaborador
DROP POLICY IF EXISTS "process_timeline lawyer read own" ON public.process_timeline;
CREATE POLICY "process_timeline lawyer read own" ON public.process_timeline
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.process_timeline.case_id
        AND (
          p.responsavel_id = auth.uid()
          OR auth.uid() = ANY(p.colaboradores)
        )
    )
  );

-- Admin pode inserir na empresa
DROP POLICY IF EXISTS "process_timeline admin insert company" ON public.process_timeline;
CREATE POLICY "process_timeline admin insert company" ON public.process_timeline
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.process_timeline.company_id
    )
  );

-- Profissional pode inserir eventos em processos onde trabalha
DROP POLICY IF EXISTS "process_timeline professional insert own" ON public.process_timeline;
CREATE POLICY "process_timeline professional insert own" ON public.process_timeline
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.process_timeline.case_id
        AND (
          p.responsavel_id = auth.uid()
          OR auth.uid() = ANY(p.colaboradores)
        )
    )
  );

-- NÃO criar policies de UPDATE nem DELETE - tabela é imutável

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role full access process_timeline" ON public.process_timeline;
CREATE POLICY "service_role full access process_timeline" ON public.process_timeline
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
