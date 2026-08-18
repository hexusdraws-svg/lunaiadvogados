-- Migration: 20260813_remove_processo_id_from_agenda.sql
-- Remove a coluna processo_id da tabela agenda, pois eventos da agenda
-- nao exigem vinculo com processo.

ALTER TABLE public.agenda DROP COLUMN IF EXISTS processo_id;
