-- Legal CRM: Processo documentos storage bucket with RLS
-- Migration: 20260615_processo_documentos_storage.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('processo-documentos', 'processo-documentos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

CREATE POLICY IF NOT EXISTS "authenticated read processo-documentos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'processo-documentos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "authenticated upload processo-documentos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'processo-documentos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.company_id IS NOT NULL
  )
);

CREATE POLICY IF NOT EXISTS "authenticated update processo-documentos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'processo-documentos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.company_id IS NOT NULL
  )
);

CREATE POLICY IF NOT EXISTS "authenticated delete processo-documentos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'processo-documentos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT p.company_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.company_id IS NOT NULL
  )
);
