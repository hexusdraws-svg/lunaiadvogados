-- Migration: 20260717_legal_guidance_table.sql
-- Fase 2 do módulo "Orientação Jurídica"
-- Tabela dedicada de orientação jurídica associada a cada audiência (hearing_id)
-- Uma audiência possui apenas uma orientação jurídica (1:1 via hearing_id)
-- O processo é apenas informativo (process_id); a chave principal é hearing_id

-- =========================================================
-- 1. TABELA legal_guidance
-- =========================================================
CREATE TABLE IF NOT EXISTS public.legal_guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  hearing_id uuid NOT NULL REFERENCES public.hearings(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processos(id),
  status text NOT NULL DEFAULT 'processing',
  summary text,
  legal_analysis text,
  recommended_strategy text,
  probable_questions text,
  jurisprudence text,
  important_points text,
  next_steps text,
  audio_url text,
  generated_by text,
  model_used text,
  tokens_used integer,
  generation_time integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.legal_guidance IS 'Orientação jurídica gerada por IA para cada audiência';
COMMENT ON COLUMN public.legal_guidance.hearing_id IS 'Audiência proprietária da orientação (chave principal)';
COMMENT ON COLUMN public.legal_guidance.process_id IS 'Processo relacionado (informação apenas, não é chave principal)';
COMMENT ON COLUMN public.legal_guidance.status IS 'Status da geração: processing, completed, failed';
COMMENT ON COLUMN public.legal_guidance.audio_url IS 'URL pública do resumo em áudio (externo, não armazenado no Supabase)';

-- =========================================================
-- 2. TRIGGER para updated_at automático
-- =========================================================
DROP TRIGGER IF EXISTS trg_legal_guidance_updated_at ON public.legal_guidance;
CREATE TRIGGER trg_legal_guidance_updated_at
  BEFORE UPDATE ON public.legal_guidance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. ÍNDICES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_legal_guidance_company ON public.legal_guidance(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_guidance_hearing ON public.legal_guidance(hearing_id);
CREATE INDEX IF NOT EXISTS idx_legal_guidance_process ON public.legal_guidance(process_id);

-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.legal_guidance ENABLE ROW LEVEL SECURITY;

-- A lógica de acesso espelha exatamente a tabela hearings:
-- quem pode ver a audiência poderá ver também a orientação jurídica.

-- Admin / super_admin vê todas as orientações da empresa.
-- Tolerante a company_id NULL: deduz a empresa a partir da audiência (hearings.company_id).
DROP POLICY IF EXISTS "legal_guidance admin read company" ON public.legal_guidance;
CREATE POLICY "legal_guidance admin read company" ON public.legal_guidance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id IS NOT NULL
        AND p_admin.company_id = COALESCE(
          public.legal_guidance.company_id,
          (SELECT h.company_id FROM public.hearings h WHERE h.id = public.legal_guidance.hearing_id)
        )
    )
  );

-- Profissional vê a orientação se puder ver a audiência (responsável ou colaborador do processo)
DROP POLICY IF EXISTS "legal_guidance professional read own" ON public.legal_guidance;
CREATE POLICY "legal_guidance professional read own" ON public.legal_guidance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.legal_guidance.hearing_id
        AND (
          h.responsible_professional_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.processos p
            WHERE p.id = h.case_id
              AND (
                p.responsavel_id = auth.uid()
                OR auth.uid() = ANY(p.colaboradores)
              )
          )
        )
    )
  );

-- Admin pode inserir na empresa (tolerante a company_id NULL)
DROP POLICY IF EXISTS "legal_guidance admin insert company" ON public.legal_guidance;
CREATE POLICY "legal_guidance admin insert company" ON public.legal_guidance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id IS NOT NULL
        AND p_admin.company_id = COALESCE(
          public.legal_guidance.company_id,
          (SELECT h.company_id FROM public.hearings h WHERE h.id = public.legal_guidance.hearing_id)
        )
    )
  );

-- Profissional pode inserir se puder ver a audiência
DROP POLICY IF EXISTS "legal_guidance professional insert own" ON public.legal_guidance;
CREATE POLICY "legal_guidance professional insert own" ON public.legal_guidance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.legal_guidance.hearing_id
        AND (
          h.responsible_professional_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.processos p
            WHERE p.id = h.case_id
              AND (
                p.responsavel_id = auth.uid()
                OR auth.uid() = ANY(p.colaboradores)
              )
          )
        )
    )
  );

-- Admin pode atualizar na empresa (tolerante a company_id NULL)
DROP POLICY IF EXISTS "legal_guidance admin update company" ON public.legal_guidance;
CREATE POLICY "legal_guidance admin update company" ON public.legal_guidance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id IS NOT NULL
        AND p_admin.company_id = COALESCE(
          public.legal_guidance.company_id,
          (SELECT h.company_id FROM public.hearings h WHERE h.id = public.legal_guidance.hearing_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id IS NOT NULL
        AND p_admin.company_id = COALESCE(
          public.legal_guidance.company_id,
          (SELECT h.company_id FROM public.hearings h WHERE h.id = public.legal_guidance.hearing_id)
        )
    )
  );

-- Profissional pode atualizar se puder ver a audiência
DROP POLICY IF EXISTS "legal_guidance professional update own" ON public.legal_guidance;
CREATE POLICY "legal_guidance professional update own" ON public.legal_guidance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.legal_guidance.hearing_id
        AND (
          h.responsible_professional_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.processos p
            WHERE p.id = h.case_id
              AND (
                p.responsavel_id = auth.uid()
                OR auth.uid() = ANY(p.colaboradores)
              )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.legal_guidance.hearing_id
        AND (
          h.responsible_professional_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.processos p
            WHERE p.id = h.case_id
              AND (
                p.responsavel_id = auth.uid()
                OR auth.uid() = ANY(p.colaboradores)
              )
          )
        )
    )
  );

-- Admin pode deletar na empresa (tolerante a company_id NULL)
DROP POLICY IF EXISTS "legal_guidance admin delete company" ON public.legal_guidance;
CREATE POLICY "legal_guidance admin delete company" ON public.legal_guidance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id IS NOT NULL
        AND p_admin.company_id = COALESCE(
          public.legal_guidance.company_id,
          (SELECT h.company_id FROM public.hearings h WHERE h.id = public.legal_guidance.hearing_id)
        )
    )
  );

-- Service role: acesso total (usado pelo N8N / backend)
DROP POLICY IF EXISTS "service_role full access legal_guidance" ON public.legal_guidance;
CREATE POLICY "service_role full access legal_guidance" ON public.legal_guidance
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- 5. REALTIME (supabase_realtime publication)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'legal_guidance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_guidance;
  END IF;
END $$;

ALTER TABLE public.legal_guidance REPLICA IDENTITY FULL;
