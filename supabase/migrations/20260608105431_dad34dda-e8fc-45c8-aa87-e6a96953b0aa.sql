
CREATE POLICY "creative_assets_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'creative-assets' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "creative_assets_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creative-assets' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "creative_assets_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'creative-assets' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "creative_assets_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creative-assets' AND (storage.foldername(name))[2] = auth.uid()::text);
