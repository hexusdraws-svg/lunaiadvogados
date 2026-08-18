-- Migration: 20260813_remove_profissional_contact_from_tarefas.sql
-- Remove as colunas de contacto do profissional da tabela tarefas,
-- pois os lembretes automaticos foram removidos da interface.

ALTER TABLE public.tarefas DROP COLUMN IF EXISTS phone_country_code;
ALTER TABLE public.tarefas DROP COLUMN IF EXISTS phone_number;
