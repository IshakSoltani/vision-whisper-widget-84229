
-- Migration: 20251107161530
BEGIN;

-- Create a public bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to files in the 'uploads' bucket
DROP POLICY IF EXISTS "Public can read uploads" ON storage.objects;
CREATE POLICY "Public can read uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow anyone (including anonymous users) to upload into 'uploads'
DROP POLICY IF EXISTS "Anyone can upload to uploads" ON storage.objects;
CREATE POLICY "Anyone can upload to uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads');

COMMIT;
