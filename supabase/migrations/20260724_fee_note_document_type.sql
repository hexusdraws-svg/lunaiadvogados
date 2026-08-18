-- Migration: 20260724_fee_note_document_type.sql
-- Adds document_type discriminator to fee_notes to support budgets and invoices
-- in a single table, as requested in the financial module restructuring.

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'budget' CHECK (document_type IN ('budget','invoice'));

ALTER TABLE public.fee_notes
  ADD COLUMN IF NOT EXISTS source_fee_note_id uuid REFERENCES public.fee_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_notes_document_type ON public.fee_notes(document_type);
CREATE INDEX IF NOT EXISTS idx_fee_notes_source ON public.fee_notes(source_fee_note_id);
