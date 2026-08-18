-- Migration: 20260813_add_profissional_contact_to_agenda.sql
-- Adiciona campos de contacto do profissional para notificacoes WhatsApp

ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
ALTER TABLE public.agenda ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.agenda.phone_country_code IS 'Codigo do pais para WhatsApp do profissional';
COMMENT ON COLUMN public.agenda.phone_number IS 'Numero de celular do profissional para lembretes';
