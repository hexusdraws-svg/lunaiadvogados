-- Processo Documentos Storage Bucket with RLS
-- Migration: 20260613_processo_documentos_storage.sql

-- Step 1: Create bucket (public = false for private access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('processo-documentos', 'processo-documentos', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- Step 2: RLS Policies for authenticated access

-- Authenticated users can read files (for viewing/downloading documents)
CREATE POLICY "Authenticated users can read processo-documentos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'processo-documentos'
  AND auth.uid() IS NOT NULL
);

-- Authenticated users can upload documents
-- Path structure: processos/${processoId}/${fileName}
CREATE POLICY "Authenticated users can upload to processo-documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'processo-documentos'
  AND auth.uid() IS NOT NULL
);

-- Authenticated users can update their own files
CREATE POLICY "Authenticated users can update processo-documentos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'processo-documentos'
  AND auth.uid() IS NOT NULL
);

-- Authenticated users can delete files
CREATE POLICY "Authenticated users can delete from processo-documentos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'processo-documentos'
  AND auth.uid() IS NOT NULL
);
