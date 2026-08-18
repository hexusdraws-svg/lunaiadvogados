-- Migration: 20260813_add_profissional_contact_to_tarefas.sql
-- Adiciona campos de contacto do profissional para notificacoes WhatsApp

ALTER TABLE IF EXISTS public.tarefas 
ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.tarefas.phone_country_code IS 'Codigo do pais para WhatsApp do profissional';
COMMENT ON COLUMN public.tarefas.phone_number IS 'Numero de celular do profissional para lembretes';
