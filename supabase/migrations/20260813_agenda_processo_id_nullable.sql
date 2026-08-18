-- Migration: 20260813_agenda_processo_id_nullable.sql
-- Agenda event creation must NOT require a linked processo.
-- The 'agenda' table may have been created with processo_id NOT NULL, which
-- blocks creating standalone calendar events (audiencias/tarefas/manual) that
-- are not tied to a legal process. Make the column nullable again.

ALTER TABLE public.agenda ALTER COLUMN processo_id DROP NOT NULL;

COMMENT ON COLUMN public.agenda.processo_id IS 'Processo associado ao evento (opcional, FK -> processos.id). Eventos da agenda não exigem processo.';
