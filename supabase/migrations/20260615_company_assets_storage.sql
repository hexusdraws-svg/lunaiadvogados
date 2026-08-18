-- Company Assets Storage Bucket
-- Migration for company logos and signatures
-- Bucket ID: company-assets
-- Path structure: logo/${uuid}.${ext} and assinatura/${uuid}.${ext}

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Public can read (logos/signatures are public)
CREATE POLICY IF NOT EXISTS "public read company-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');

-- Authenticated users can upload company assets
CREATE POLICY IF NOT EXISTS "authenticated upload company-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets'
  AND auth.uid() IS NOT NULL
);

-- Authenticated users can update company assets
CREATE POLICY IF NOT EXISTS "authenticated update company-assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-assets'
  AND auth.uid() IS NOT NULL
);

-- Authenticated users can delete company assets
CREATE POLICY IF NOT EXISTS "authenticated delete company-assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-assets'
  AND auth.uid() IS NOT NULL
);
