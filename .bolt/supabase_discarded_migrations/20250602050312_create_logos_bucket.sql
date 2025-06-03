-- Create a new storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Create a policy to allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Create a policy to allow public access to logos
CREATE POLICY "Allow public access to logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');

-- Create a policy to allow authenticated users to update their own logos
CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Create a policy to allow authenticated users to delete their own logos
CREATE POLICY "Allow authenticated users to delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
); 