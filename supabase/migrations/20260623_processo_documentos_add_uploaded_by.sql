-- Add uploaded_by to processo_documentos for multi-user tracking
-- Migration: 20260623_processo_documentos_add_uploaded_by.sql

ALTER TABLE public.processo_documentos
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_processo_documentos_uploaded_by ON public.processo_documentos(uploaded_by);
