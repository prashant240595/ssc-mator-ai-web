
CREATE POLICY "Admin can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );

CREATE POLICY "Admin can list blog images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com'
  );
