-- Migration: 20260626_add_avatar_url_to_profiles.sql
-- Objetivo: Adicionar coluna avatar_url na tabela profiles se não existir

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL do avatar do utilizador armazenado no Supabase Storage';
