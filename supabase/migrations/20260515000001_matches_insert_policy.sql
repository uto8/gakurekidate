-- matches テーブルに INSERT ポリシーを追加
-- 相互いいね成立時に API Route Handler（Server Client）が INSERT するため必要
create policy "matches_insert"
  on public.matches for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);
