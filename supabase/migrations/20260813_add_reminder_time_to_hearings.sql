-- Migration: 20260813_add_reminder_time_to_hearings.sql
-- Adiciona a coluna reminder_time a tabela hearings (horario do lembrete)

ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS reminder_time TEXT;

COMMENT ON COLUMN public.hearings.reminder_time IS 'Horario do lembrete para audiencia';
