-- avatars バケット作成（公開読み取り）
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- 全員が読み取り可能
create policy "avatars_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- アップロードは本人フォルダ（{userId}/...）のみ
create policy "avatars_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 更新も本人フォルダのみ
create policy "avatars_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 削除も本人フォルダのみ
create policy "avatars_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
