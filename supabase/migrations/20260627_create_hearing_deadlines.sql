-- Migration: 20260627_create_hearing_deadlines.sql
-- Objetivo: Criar prazos associados a audiências (lembretes, preparação, recursos)
-- Nota: A tabela hearings deve ser criada antes desta migration

-- =========================================================
-- 1. ENUM para status de prazo de audiência
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hearing_deadline_status') THEN
    CREATE TYPE public.hearing_deadline_status AS ENUM ('Pending', 'Completed', 'Expired');
  END IF;
END $$;

-- =========================================================
-- 2. TABELA hearing_deadlines
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hearing_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hearing_id uuid NOT NULL REFERENCES public.hearings(id) ON DELETE CASCADE,
  deadline_date date NOT NULL,
  title text NOT NULL,
  description text,
  status public.hearing_deadline_status NOT NULL DEFAULT 'Pending',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hearing_deadlines IS 'Prazos associados a audiências (preparação, recursos, lembretes)';
COMMENT ON COLUMN public.hearing_deadlines.hearing_id IS 'Referência à audiência relacionada';
COMMENT ON COLUMN public.hearing_deadlines.deadline_date IS 'Data limite para cumprimento do prazo';
COMMENT ON COLUMN public.hearing_deadlines.status IS 'Status: Pending, Completed, Expired';
COMMENT ON COLUMN public.hearing_deadlines.completed_at IS 'Data/hora de conclusão do prazo';

-- =========================================================
-- 3. TRIGGER para updated_at automático
-- =========================================================
DROP TRIGGER IF EXISTS trg_hearing_deadlines_updated_at ON public.hearing_deadlines;
CREATE TRIGGER trg_hearing_deadlines_updated_at
  BEFORE UPDATE ON public.hearing_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. ÍNDICES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_hearing_deadlines_hearing ON public.hearing_deadlines(hearing_id);
CREATE INDEX IF NOT EXISTS idx_hearing_deadlines_company ON public.hearing_deadlines(company_id);
CREATE INDEX IF NOT EXISTS idx_hearing_deadlines_deadline_date ON public.hearing_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_hearing_deadlines_status ON public.hearing_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_hearing_deadlines_created_by ON public.hearing_deadlines(created_by);

-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.hearing_deadlines ENABLE ROW LEVEL SECURITY;

-- Admin vê todos os prazos da empresa
DROP POLICY IF EXISTS "hearing_deadlines admin read company" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines admin read company" ON public.hearing_deadlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearing_deadlines.company_id
    )
  );

-- Profissional vê prazos de audiências onde é o responsável
DROP POLICY IF EXISTS "hearing_deadlines professional read own" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines professional read own" ON public.hearing_deadlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.hearing_deadlines.hearing_id
        AND h.responsible_professional_id = auth.uid()
    )
  );

-- Admin pode inserir na empresa
DROP POLICY IF EXISTS "hearing_deadlines admin insert company" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines admin insert company" ON public.hearing_deadlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearing_deadlines.company_id
    )
  );

-- Profissional pode inserir prazos para suas audiências
DROP POLICY IF EXISTS "hearing_deadlines professional insert own" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines professional insert own" ON public.hearing_deadlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.hearing_deadlines.hearing_id
        AND h.responsible_professional_id = auth.uid()
    )
  );

-- Admin pode atualizar na empresa
DROP POLICY IF EXISTS "hearing_deadlines admin update company" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines admin update company" ON public.hearing_deadlines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearing_deadlines.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearing_deadlines.company_id
    )
  );

-- Profissional pode atualizar prazos de suas audiências
DROP POLICY IF EXISTS "hearing_deadlines professional update own" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines professional update own" ON public.hearing_deadlines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.hearing_deadlines.hearing_id
        AND h.responsible_professional_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.hearing_deadlines.hearing_id
        AND h.responsible_professional_id = auth.uid()
    )
  );

-- Admin pode deletar na empresa
DROP POLICY IF EXISTS "hearing_deadlines admin delete company" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines admin delete company" ON public.hearing_deadlines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearing_deadlines.company_id
    )
  );

-- Profissional pode deletar prazos de suas audiências
DROP POLICY IF EXISTS "hearing_deadlines professional delete own" ON public.hearing_deadlines;
CREATE POLICY "hearing_deadlines professional delete own" ON public.hearing_deadlines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.hearings h
      WHERE h.id = public.hearing_deadlines.hearing_id
        AND h.responsible_professional_id = auth.uid()
    )
  );

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role full access hearing_deadlines" ON public.hearing_deadlines;
CREATE POLICY "service_role full access hearing_deadlines" ON public.hearing_deadlines
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
