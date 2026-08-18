-- Migration: 20260720_agenda_events.sql
-- Objetivo: Criar tabela de eventos da agenda para o calendário visual.
-- Não altera RLS existente, autenticação, multi-tenant.

CREATE TABLE IF NOT EXISTS public.agenda_events (
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

COMMENT ON TABLE public.agenda_events IS 'Eventos da agenda/calendário da empresa';
COMMENT ON COLUMN public.agenda_events.event_type IS 'Tipo: audiencia, tarefa, consultoria, manual';
COMMENT ON COLUMN public.agenda_events.status IS 'Status: scheduled, completed, cancelled';

CREATE INDEX IF NOT EXISTS idx_agenda_events_company ON public.agenda_events(company_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_date ON public.agenda_events(event_date);
CREATE INDEX IF NOT EXISTS idx_agenda_events_type ON public.agenda_events(event_type);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_events company crud" ON public.agenda_events;
CREATE POLICY "agenda_events company crud" ON public.agenda_events
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role full access agenda_events" ON public.agenda_events;
CREATE POLICY "service_role full access agenda_events" ON public.agenda_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
