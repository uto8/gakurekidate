-- =============================================================
-- 未読バッジ機能: message_read_receipts テーブル
-- =============================================================
-- 設計判断:
--   「チャットを最後に開いた時刻」を (match_id, user_id) 単位で管理する。
--   個々のメッセージへの is_read フラグは持たない（要件 UB-3 参照）。
--
-- RLS 方針:
--   DELETE ポリシーを意図的に設けない。
--   ユーザーが自分の receipt を手動削除して未読状態をリセットするのを防ぐ。
-- =============================================================

-- 1. テーブル作成
create table public.message_read_receipts (
  match_id     uuid        not null references public.matches(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- 2. RLS 有効化
alter table public.message_read_receipts enable row level security;

-- 3. SELECT: 自分のレコードのみ参照可能
create policy "read_receipts_select"
  on public.message_read_receipts for select
  using (user_id = auth.uid());

-- 4. INSERT: 自分のレコードかつ match 参加者のみ
--    is_match_participant() は既存の SECURITY DEFINER 関数（20260515000003）を流用
create policy "read_receipts_write"
  on public.message_read_receipts for insert
  with check (
    user_id = auth.uid()
    and public.is_match_participant(match_id)
  );

-- 5. UPDATE: 自分のレコードかつ match 参加者のみ
create policy "read_receipts_update"
  on public.message_read_receipts for update
  using  (user_id = auth.uid() and public.is_match_participant(match_id))
  with check (user_id = auth.uid() and public.is_match_participant(match_id));

-- 6. インデックス
--    PRIMARY KEY (match_id, user_id) が match_id 先頭インデックスを兼ねる。
--    user_id 単体での全マッチ既読状態一覧取得用に追加。
create index idx_read_receipts_user on public.message_read_receipts(user_id);

-- 7. Realtime 設定
--    useUnreadCount フックが message_read_receipts の変更イベントを購読するために必要。
alter table public.message_read_receipts replica identity full;
alter publication supabase_realtime add table public.message_read_receipts;
