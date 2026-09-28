
CREATE POLICY "Admin can upload to admin-pdf-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'admin-pdf-uploads'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can read admin-pdf-uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'admin-pdf-uploads'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can update admin-pdf-uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'admin-pdf-uploads'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can delete admin-pdf-uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'admin-pdf-uploads'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );
