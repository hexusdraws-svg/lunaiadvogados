-- Migration: 20260710_add_phone_fields_to_profiles.sql
-- Objetivo: Adicionar campos estruturados de telefone ao profile

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+258',
ADD COLUMN IF NOT EXISTS phone_number text;

COMMENT ON COLUMN public.profiles.phone_country_code IS 'Código do país para WhatsApp (ex: +258)';
COMMENT ON COLUMN public.profiles.phone_number IS 'Número de telefone/WhatsApp sem DDI';
