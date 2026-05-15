-- =============================================================
-- Realtime + RLS 対応修正
-- =============================================================
-- 問題:
--   messages_select ポリシーが matches テーブルへのサブクエリを持ち、
--   matches 自体にも RLS が有効なため、Supabase Realtime が
--   postgres_changes イベントの RLS チェックで連鎖失敗する。
--
-- 修正:
--   SECURITY DEFINER 関数でサブクエリを隔離し、
--   Realtime が評価するポリシーをシンプルな関数呼び出しにする。
-- =============================================================

-- 1. マッチング参加者チェック関数（SECURITY DEFINER = matches の RLS をバイパス）
create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.matches
    where id = p_match_id
      and (user1_id = auth.uid() or user2_id = auth.uid())
  );
$$;

-- 関数は postgres ロール所有として anon / authenticated に実行権限を付与
grant execute on function public.is_match_participant(uuid) to anon, authenticated;

-- 2. messages_select ポリシーを再作成（サブクエリを関数呼び出しに変更）
drop policy if exists "messages_select" on public.messages;

create policy "messages_select"
  on public.messages for select
  using (public.is_match_participant(match_id));

-- 3. messages_insert ポリシーも同様に更新
drop policy if exists "messages_insert" on public.messages;

create policy "messages_insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_match_participant(match_id)
  );
