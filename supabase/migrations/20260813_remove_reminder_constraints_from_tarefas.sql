-- Migration: 20260813_remove_reminder_constraints_from_tarefas.sql
-- Remove a obrigatoriedade dos campos de lembrete da tabela tarefas,
-- pois os lembretes automaticos foram removidos da interface.

ALTER TABLE public.tarefas ALTER COLUMN reminder_date DROP NOT NULL;
ALTER TABLE public.tarefas ALTER COLUMN reminder_time DROP NOT NULL;

COMMENT ON COLUMN public.tarefas.reminder_date IS 'Campo mantido por compatibilidade, mas deixado de lado pois lembretes automaticos foram removidos das tarefas';
COMMENT ON COLUMN public.tarefas.reminder_time IS 'Campo mantido por compatibilidade, mas deixado de lado pois lembretes automaticos foram removidos das tarefas';
