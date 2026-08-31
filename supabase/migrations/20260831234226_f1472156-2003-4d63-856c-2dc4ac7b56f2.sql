CREATE POLICY "videos_read" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "videos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "videos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "videos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'videos');