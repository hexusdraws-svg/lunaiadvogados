-- Migration: 20260627_create_hearings.sql
-- Objetivo: Criar tabela de audiências judiciais
-- Dependências: tables companies, processos, profissionais (via profiles), profiles

-- =========================================================
-- 1. ENUM para status de audiência
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hearing_status') THEN
    CREATE TYPE public.hearing_status AS ENUM ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled');
  END IF;
END $$;

-- =========================================================
-- 2. TABELA hearings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  responsible_professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  hearing_date date NOT NULL,
  hearing_time time NOT NULL,
  court_name text NOT NULL,
  courtroom text,
  judge_name text,
  city text NOT NULL,
  address text,
  notes text,
  status public.hearing_status NOT NULL DEFAULT 'Scheduled',
  reminder_date date,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hearings IS 'Audiências judiciais associadas a processos';
COMMENT ON COLUMN public.hearings.case_id IS 'Processo relacionado com a audiência';
COMMENT ON COLUMN public.hearings.responsible_professional_id IS 'Profissional responsável pela audiência';
COMMENT ON COLUMN public.hearings.hearing_date IS 'Data da audiência';
COMMENT ON COLUMN public.hearings.hearing_time IS 'Hora da audiência';
COMMENT ON COLUMN public.hearings.court_name IS 'Nome do tribunal';
COMMENT ON COLUMN public.hearings.courtroom IS 'Sala da audiência';
COMMENT ON COLUMN public.hearings.judge_name IS 'Nome do juiz';
COMMENT ON COLUMN public.hearings.city IS 'Cidade da audiência';
COMMENT ON COLUMN public.hearings.address IS 'Endereço do tribunal';
COMMENT ON COLUMN public.hearings.notes IS 'Observações adicionais';
COMMENT ON COLUMN public.hearings.status IS 'Status: Scheduled, Completed, Cancelled, Rescheduled';
COMMENT ON COLUMN public.hearings.reminder_date IS 'Data do lembrete/notificação';

-- =========================================================
-- 3. TRIGGER para updated_at automático
-- =========================================================
DROP TRIGGER IF EXISTS trg_hearings_updated_at ON public.hearings;
CREATE TRIGGER trg_hearings_updated_at
  BEFORE UPDATE ON public.hearings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. ÍNDICES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_hearings_case ON public.hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_hearings_company ON public.hearings(company_id);
CREATE INDEX IF NOT EXISTS idx_hearings_responsible ON public.hearings(responsible_professional_id);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON public.hearings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_hearings_status ON public.hearings(status);
CREATE INDEX IF NOT EXISTS idx_hearings_reminder ON public.hearings(reminder_date);

-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;

-- Admin vê todas as audiências da empresa
DROP POLICY IF EXISTS "hearings admin read company" ON public.hearings;
CREATE POLICY "hearings admin read company" ON public.hearings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
  );

-- Profissional vê apenas suas próprias audiências
DROP POLICY IF EXISTS "hearings professional read own" ON public.hearings;
CREATE POLICY "hearings professional read own" ON public.hearings
  FOR SELECT USING (
    auth.uid() = responsible_professional_id
    OR
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.hearings.case_id
        AND (
          p.responsavel_id = auth.uid()
          OR auth.uid() = ANY(p.colaboradores)
        )
    )
  );

-- Admin pode inserir na empresa
DROP POLICY IF EXISTS "hearings admin insert company" ON public.hearings;
CREATE POLICY "hearings admin insert company" ON public.hearings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
  );

-- Profissional pode inserir audiências para processos onde é responsável ou colaborador
DROP POLICY IF EXISTS "hearings professional insert own" ON public.hearings;
CREATE POLICY "hearings professional insert own" ON public.hearings
  FOR INSERT WITH CHECK (
    auth.uid() = responsible_professional_id
    AND
    EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = public.hearings.case_id
        AND (
          p.responsavel_id = auth.uid()
          OR auth.uid() = ANY(p.colaboradores)
        )
    )
  );

-- Admin pode atualizar na empresa
DROP POLICY IF EXISTS "hearings admin update company" ON public.hearings;
CREATE POLICY "hearings admin update company" ON public.hearings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
  );

-- Admin pode deletar na empresa
DROP POLICY IF EXISTS "hearings admin delete company" ON public.hearings;
CREATE POLICY "hearings admin delete company" ON public.hearings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.hearings.company_id
    )
  );

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role full access hearings" ON public.hearings;
CREATE POLICY "service_role full access hearings" ON public.hearings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
