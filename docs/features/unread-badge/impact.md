# 未読バッジ機能 — 影響調査レポート

調査日: 2026-05-15

---

## 機能概要

- BottomNav の「マッチング」タブに合計未読メッセージ数バッジを表示
- チャット一覧（MatchListItem）に per-chat 未読数バッジを表示
- `chat/[matchId]` を開いた瞬間、および Realtime で新メッセージ受信時に自動既読マーク
- 未読カウント対象: 相手から受信したメッセージのみ（自分送信は除外）

---

## 1. 変更・追加が必要なファイル一覧

### 新規作成

| ファイル | 理由 |
|---|---|
| `supabase/migrations/YYYYMMDD_message_read_receipts.sql` | 既読管理テーブル作成・RLS・インデックス |
| `src/hooks/useUnreadCount.ts` | BottomNav 用の合計未読数 Realtime フック |

### 既存ファイルの変更

| ファイル | 変更内容 |
|---|---|
| `src/types/index.ts` | `Match` 型に `unread_count: number` を追加 |
| `src/types/database.ts` | `supabase gen types` で再生成（`message_read_receipts` テーブルの型追加）|
| `src/lib/actions/matches.ts` | `getMatchesAction()` の戻り値に `unread_count` を追加 |
| `src/lib/actions/messages.ts` | `markAsReadAction(matchId)` と `getTotalUnreadCountAction()` を新規追加 |
| `src/hooks/useMessages.ts` | Realtime INSERT 受信時に `markAsReadAction()` を呼ぶ処理を追加 |
| `src/components/layout/BottomNav.tsx` | `useUnreadCount()` 使用・マッチングタブにバッジ追加 |
| `src/components/match/MatchListItem.tsx` | Props に `unreadCount?: number` 追加・バッジ UI 追加 |
| `src/app/(main)/matches/page.tsx` | `Match.unread_count` を `MatchListItem` に渡すよう更新 |
| `src/components/chat/ChatView.tsx` | マウント時に `markAsReadAction()` を呼ぶ `useEffect` を追加 |

### 変更不要（確認済み）

| ファイル | 理由 |
|---|---|
| `src/app/(main)/layout.tsx` | BottomNav を呼び出しているが、フック化するため props 変更不要 |
| `src/app/(main)/chat/[matchId]/page.tsx` | ChatView に既読処理を移譲するため変更不要 |

---

## 2. 影響を受ける既存機能

### Match 型の拡張（破壊的変更）

```typescript
// 変更前
type Match = { id: string; partner: Profile; created_at: string; last_message: string | null }

// 変更後
type Match = { id: string; partner: Profile; created_at: string; last_message: string | null; unread_count: number }
```

`Match` 型を使用している箇所はすべて変更の影響を受ける。TypeScript の型チェックで検出可能。

**影響箇所:**
- `src/lib/actions/matches.ts` — 返却時に `unread_count` を組み立てる必要あり
- `src/lib/actions/messages.ts` — `getMatchAction()` の戻り値型が `Match` を参照しているかを確認
- `src/app/(main)/matches/page.tsx` — `Match[]` を受け取り `MatchListItem` に渡す

### getMatchesAction の動作変更

現在は `messages` テーブルから最新メッセージのみ取得しているが、変更後は `message_read_receipts` も JOIN/サブクエリして未読数を計算する。クエリ数・処理時間が増加する。

### useMessages フックの動作拡張

Realtime の INSERT ハンドラーに `markAsReadAction()` の呼び出しが追加される。これにより、チャット画面を開いている間に受信したメッセージは即時既読になる。既存の楽観的 UI（`addOptimistic` / `rollbackOptimistic`）のロジックへの影響はない。

---

## 3. 既存データモデルへの変更

### マイグレーション要否: 必要

#### 新規テーブル: `message_read_receipts`

```sql
create table public.message_read_receipts (
  match_id    uuid        not null references public.matches(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- Realtime 対応
alter table public.message_read_receipts replica identity full;
alter publication supabase_realtime add table public.message_read_receipts;

-- インデックス
create index idx_read_receipts_user on public.message_read_receipts(user_id);

-- RLS
alter table public.message_read_receipts enable row level security;
```

#### RLS ポリシー（要 SECURITY DEFINER 関数）

`messages` テーブルの先例（`is_match_participant()` 関数）と同様に、RLS サブクエリの連鎖失敗を避けるため SECURITY DEFINER 関数経由でポリシーを定義する。

```sql
-- SELECT: 自分のレコードのみ
create policy "read_receipts_select"
  on public.message_read_receipts for select
  using (user_id = auth.uid());

-- INSERT/UPDATE: 自分 かつ match 参加者のみ
create policy "read_receipts_upsert"
  on public.message_read_receipts for all
  using (user_id = auth.uid() and is_match_participant(match_id))
  with check (user_id = auth.uid() and is_match_participant(match_id));
```

#### 既存テーブルへの変更

`messages`・`matches`・`profiles` テーブルへの変更は**なし**。

---

## 4. 既存 API への変更と破壊的変更

### getMatchesAction — 破壊的変更あり

| 項目 | 現在 | 変更後 |
|---|---|---|
| 戻り値の型 | `ActionResult<Match[]>` | 同じ（`Match` 型が拡張される）|
| `unread_count` | 存在しない | 必須フィールド `number` として追加 |
| クエリ数 | matches + profiles + messages(最新) | + `message_read_receipts`（未読数計算）|

TypeScript のビルドエラーとして検出されるため、コンパイル前に漏れなく修正できる。

### getMessagesAction — 変更なし

既読マーク処理は `markAsReadAction` として独立した Action に分離する。`getMessagesAction` 自体には手を加えない。

### 新規 Server Actions

| Action | シグネチャ | 用途 |
|---|---|---|
| `markAsReadAction` | `(matchId: string) => Promise<ActionResult<null>>` | match を既読マーク（UPSERT）|
| `getTotalUnreadCountAction` | `() => Promise<ActionResult<number>>` | 全 match の合計未読数 |

---

## 5. 影響を受けるテスト

### 既存テストファイル（影響軽微）

| ファイル | 影響 |
|---|---|
| `src/lib/__tests__/matchLogic.test.ts` | `resolvePartnerId` / `resolveMatchPair` は変更なし。影響なし |
| `src/lib/__tests__/messageUtils.test.ts` | フォーマット関数は変更なし。影響なし |
| `src/lib/__tests__/utils.test.ts` | 汎用ユーティリティは変更なし。影響なし |

### 新規テストが必要

| テスト対象 | テスト種別 |
|---|---|
| `markAsReadAction` の UPSERT ロジック | ユニットテスト |
| `getTotalUnreadCountAction` の集計ロジック | ユニットテスト |
| `getMatchesAction` の `unread_count` 計算 | ユニットテスト |
| `MatchListItem` のバッジ表示条件 | コンポーネントテスト |
| `BottomNav` のバッジ表示 | コンポーネントテスト |
| 複数ユーザー間の既読・未読状態遷移 | E2E テスト（現状なし）|

---

## 6. リスクと懸念点

### HIGH: RLS + Realtime の連鎖失敗

**内容:** `message_read_receipts` の RLS ポリシーで `matches` テーブルをサブクエリすると、Realtime チャネルでの RLS 評価が失敗する既知の問題がある（既存の `messages` テーブルで同様の問題が発生し、`is_match_participant()` SECURITY DEFINER 関数で対処済み）。

**対策:** 既存の `is_match_participant()` 関数を流用する。`message_read_receipts` の RLS ポリシーも同関数経由で定義する。

---

### MEDIUM: getMatchesAction のクエリ複雑化（N+1 リスク）

**内容:** 現在は `messages` テーブルから最新メッセージを一括取得しているが、未読数の計算に `message_read_receipts` との突合が加わる。match ごとに個別クエリを発行すると N+1 が発生する。

**対策:** 未読数をサブクエリまたは集計クエリで一括取得する。具体的には `message_read_receipts` を LEFT JOIN して `count(messages where created_at > last_read_at)` を計算するクエリをまとめて実行する。

---

### MEDIUM: Match 型の破壊的変更によるコンパイルエラー

**内容:** `unread_count` を必須フィールドとして追加すると、`getMatchesAction()` の return 文と `MatchListItem` の Props 両方でコンパイルエラーが発生する。

**対策:** TypeScript の型チェック（`npm run typecheck`）で漏れなく検出できる。実装後にビルドを確認する。

---

### MEDIUM: 既読マークのタイミング競合

**内容:** `ChatView` のマウント時（`useEffect`）と Realtime 受信時（`useMessages`）の両方で `markAsReadAction()` を呼ぶ設計になる。同時呼び出しや競合が発生する可能性がある。

**対策:** `message_read_receipts` への操作は UPSERT（INSERT ON CONFLICT UPDATE）で実装する。冪等性があるため、複数回呼ばれても問題ない。

---

### MEDIUM: useUnreadCount フックの Realtime 購読範囲

**内容:** BottomNav はすべての画面に常時表示される。`useUnreadCount()` が `messages` テーブルを購読する場合、チャット画面の `useMessages()` と二重購読になる。

**対策:** `message_read_receipts` テーブルの変更（自分の既読マーク更新）と `messages` の INSERT の両方を購読して合計未読数を再計算する設計とする。または `message_read_receipts` の変更のみを購読して `getTotalUnreadCountAction()` を再実行する方式でも可。

---

### LOW: 退会済みユーザーのメッセージ

**内容:** `messages.sender_id` は退会時に `SET NULL` になる。`sender_id IS NULL` のメッセージは既読カウントの対象外にする必要がある（自分のメッセージと区別できないため）。

**対策:** 未読数計算クエリで `sender_id IS NOT NULL AND sender_id != auth.uid()` を条件に加える。

---

### LOW: 複数タブ・複数デバイス同期

**内容:** ユーザーが複数タブでアプリを開いている場合、一方のタブで既読にした内容が他方に即時反映されない可能性がある。

**対策:** `message_read_receipts` テーブルを Realtime 購読対象にすることで、既読更新イベントが全タブに伝播する。MVP の範囲内では許容範囲。

---

## 7. 変更の依存関係と実装順序

```
[1] DB マイグレーション（message_read_receipts テーブル）
    ↓
[2] database.ts 型再生成
    ↓
[3] types/index.ts の Match 型更新
    ↓
[4] Server Actions（markAsReadAction / getTotalUnreadCountAction / getMatchesAction 更新）
    ↓
[5] hooks（useMessages 更新 / useUnreadCount 新規）
    ↓
[6] コンポーネント（MatchListItem / ChatView / BottomNav）
    ↓
[7] ページ（matches/page.tsx）
    ↓
[8] 型チェック・ビルド確認
```

各フェーズは前のフェーズに依存するため、順次実装が必要。

---

## 8. 影響範囲サマリー

| 観点 | 評価 |
|---|---|
| DB 変更 | 新規テーブル 1 本（既存テーブルへの変更なし）|
| 破壊的 API 変更 | `Match` 型の拡張（TypeScript で検出可能）|
| 新規 Action | 2 本（markAsRead / getTotalUnreadCount）|
| 新規フック | 1 本（useUnreadCount）|
| 変更コンポーネント | 3 本（BottomNav / MatchListItem / ChatView）|
| 変更ページ | 1 本（matches/page.tsx）|
| 既存テストへの影響 | なし（対象外のロジックのみ）|
| 主なリスク | RLS+Realtime 連鎖 / N+1 クエリ / 既読タイミング競合 |
