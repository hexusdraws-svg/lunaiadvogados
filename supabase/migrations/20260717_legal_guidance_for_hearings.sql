-- Migration: 20260717_legal_guidance_for_hearings.sql
-- Adiciona campos de orientação jurídica na tabela hearings

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS enable_legal_guidance boolean NOT NULL DEFAULT false;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS case_type text;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS case_description text;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS people_involved text;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS expected_outcome text;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS legal_notes text;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS legal_guidance_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS legal_guidance_generated_at timestamptz;

ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS legal_guidance_document text;

CREATE INDEX IF NOT EXISTS idx_hearings_legal_guidance_status
  ON public.hearings(legal_guidance_status);
