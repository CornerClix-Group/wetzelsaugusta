-- Create storage bucket for checklist photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-photos',
  'checklist-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for checklist photos
CREATE POLICY "Authenticated users can upload checklist photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checklist-photos');

CREATE POLICY "Users can view checklist photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Managers can delete checklist photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'checklist-photos' AND
  (has_role(auth.uid(), 'owner'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);