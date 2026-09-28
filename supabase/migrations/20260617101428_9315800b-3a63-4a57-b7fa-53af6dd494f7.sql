
CREATE POLICY "Authenticated can read question images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-images');

CREATE POLICY "Admin can upload question images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images' AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can update question images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images' AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');

CREATE POLICY "Admin can delete question images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'question-images' AND (auth.jwt() ->> 'email') = 'prashant.singh.2405@gmail.com');
