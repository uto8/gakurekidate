-- messages テーブルを Supabase Realtime の publication に追加
-- postgres_changes イベントを受信するために必要
alter publication supabase_realtime add table public.messages;

-- RLS と Realtime を正しく連携させるために replica identity を full に設定
-- これがないと RLS 有効テーブルでは変更行の全カラムが WAL に含まれず、
-- Realtime が RLS チェックを通過できない
alter table public.messages replica identity full;
