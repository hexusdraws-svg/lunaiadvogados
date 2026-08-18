-- Migration: 20260725_fix_fee_notes_missing_columns.sql
-- Adiciona colunas faltantes em fee_notes para compatibilidade com o front.

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS issue_date date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS valid_until date;

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'budget' CHECK (document_type IN ('budget','invoice'));

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS source_fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL;

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_fee_notes_document_type ON public.fee_notes(document_type);
CREATE INDEX IF NOT EXISTS idx_fee_notes_source ON public.fee_notes(source_fee_note_id);
