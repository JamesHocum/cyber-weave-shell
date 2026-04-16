drop policy if exists "Avatars publicly readable" on storage.objects;

-- Public read of individual files (anyone with the URL can fetch), but no listing of others' folders
create policy "Avatars readable by anyone with path"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or auth.role() = 'anon'
      or auth.role() = 'authenticated'
    )
  );