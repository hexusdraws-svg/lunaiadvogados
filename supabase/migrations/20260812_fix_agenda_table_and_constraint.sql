-- Migration: 20260812_fix_agenda_table_and_constraint.sql
-- Corrige a tabela agenda para garantir que a constraint de event_type
-- aceite os valores enviados pelo frontend:
-- 'audiencia', 'tarefa', 'consultoria', 'manual'
--
-- Se a tabela agenda não existir, ela será criada com a estrutura correta.
-- Se já existir, a constraint será ajustada.

-- 1. Criar tabela agenda se não existir (estrutura idêntica a agenda_events)
CREATE TABLE IF NOT EXISTS public.agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time text,
  location text,
  notes text,
  event_type text NOT NULL DEFAULT 'manual' CHECK (event_type IN ('audiencia','tarefa','consultoria','manual')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  processo_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Ajustar constraint de event_type para garantir valores corretos
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE public.agenda DROP CONSTRAINT IF EXISTS agenda_event_type_check;

  -- Recriar constraint com valores corretos
  ALTER TABLE public.agenda
    ADD CONSTRAINT agenda_event_type_check
    CHECK (event_type IN ('audiencia','tarefa','consultoria','manual'));
END $$;

-- 3. Ajustar constraint de status para garantir valores corretos
DO $$
BEGIN
  ALTER TABLE public.agenda DROP CONSTRAINT IF EXISTS agenda_status_check;
END $$;

ALTER TABLE public.agenda
  ADD CONSTRAINT agenda_status_check
  CHECK (status IN ('scheduled','completed','cancelled'));

-- 4. Garantir índices básicos
CREATE INDEX IF NOT EXISTS idx_agenda_company ON public.agenda(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_date ON public.agenda(event_date);
CREATE INDEX IF NOT EXISTS idx_agenda_type ON public.agenda(event_type);

-- 5. Habilitar RLS se ainda não estiver habilitada
ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

-- 6. Recriar política de acesso multi-tenant
DROP POLICY IF EXISTS "agenda company crud" ON public.agenda;
CREATE POLICY "agenda company crud"
  ON public.agenda
  FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 7. Garantir acesso para service_role
DROP POLICY IF EXISTS "service_role full access agenda" ON public.agenda;
CREATE POLICY "service_role full access agenda"
  ON public.agenda
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
