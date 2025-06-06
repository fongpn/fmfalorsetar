-- Create a new storage bucket for member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', false);

-- Create a policy to allow authenticated users to upload member photos
CREATE POLICY "Allow authenticated users to upload member photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'member-photos' AND
  auth.role() = 'authenticated'
);

-- Create a policy to allow authenticated users to read member photos
CREATE POLICY "Allow authenticated users to read member photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'member-photos');

-- Create a policy to allow authenticated users to update member photos
CREATE POLICY "Allow authenticated users to update member photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-photos' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'member-photos' AND
  auth.role() = 'authenticated'
);

-- Create a policy to allow authenticated users to delete member photos
CREATE POLICY "Allow authenticated users to delete member photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'member-photos' AND
  auth.role() = 'authenticated'
); 