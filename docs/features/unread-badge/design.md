# 未読バッジ機能 — 技術設計書

最終更新: 2026-05-15

---

## 1. データモデルの変更

### 1-1. 新規テーブル: `message_read_receipts`

```sql
create table public.message_read_receipts (
  match_id     uuid        not null references public.matches(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
```

**設計判断:**
- `id` カラムは不要。`(match_id, user_id)` の複合 PRIMARY KEY で一意性を保証する
- `ON DELETE CASCADE` により、マッチまたはユーザー削除時にレコードも自動削除する
- `last_read_at` のみを管理する。個々のメッセージへの参照（`message_id`）は持たない（要件 UB-3 参照）

**Realtime 設定:**

```sql
alter table public.message_read_receipts replica identity full;
alter publication supabase_realtime add table public.message_read_receipts;
```

**インデックス:**

```sql
create index idx_read_receipts_user on public.message_read_receipts(user_id);
```

PRIMARY KEY `(match_id, user_id)` が `match_id` 先頭のインデックスを兼ねる。`user_id` 単体での検索（全マッチの既読状態一覧取得）のために `idx_read_receipts_user` を追加する。

**RLS ポリシー:**

```sql
alter table public.message_read_receipts enable row level security;

-- SELECT: 自分のレコードのみ参照可能
create policy "read_receipts_select"
  on public.message_read_receipts for select
  using (user_id = auth.uid());

-- INSERT / UPDATE: 自分のレコードかつ match 参加者のみ書き込み可能
-- is_match_participant() は既存の SECURITY DEFINER 関数を流用する
create policy "read_receipts_upsert"
  on public.message_read_receipts for all
  using  (user_id = auth.uid() and is_match_participant(match_id))
  with check (user_id = auth.uid() and is_match_participant(match_id));
```

`is_match_participant()` は `supabase/migrations/20260515000003_messages_realtime_rls_fix.sql` で定義済みの SECURITY DEFINER 関数。RLS ポリシー内で `matches` テーブルをサブクエリすると Realtime の RLS 評価が連鎖失敗する既知問題があるため、この関数経由で参加確認を行う。

---

### 1-2. 既存型定義の変更（`src/types/index.ts`）

```typescript
// 変更前
type Match = {
  id: string
  partner: Profile
  created_at: string
  last_message: string | null
}

// 変更後
type Match = {
  id: string
  partner: Profile
  created_at: string
  last_message: string | null
  unread_count: number          // 追加: 0 以上の整数。未読なし = 0
}
```

`unread_count` は `null` を持たない。`message_read_receipts` レコードが存在しない場合（初回訪問）は、`getMatchesAction` 内で対象メッセージ数をそのまま返す。

---

## 2. API 設計

### 2-1. 新規 Server Action: `markAsReadAction`

**ファイル:** `src/lib/actions/messages.ts`

```typescript
markAsReadAction(matchId: string): Promise<ActionResult<null>>
```

**処理フロー:**
1. `createServerClient()` でセッション取得。未認証の場合は `{ data: null, error: "unauthorized" }` を返す
2. `matches` テーブルで `matchId` かつ自分が参加者であることを確認。参加者でない場合は `{ data: null, error: "forbidden" }` を返す
3. `message_read_receipts` に UPSERT:

```sql
INSERT INTO message_read_receipts (match_id, user_id, last_read_at)
VALUES ($matchId, $userId, now())
ON CONFLICT (match_id, user_id)
DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
```

4. 成功時 `{ data: null, error: null }` を返す
5. Supabase エラーは `supabaseErrorToMessage()` を通して `{ data: null, error: string }` を返す

**冪等性:** 同一 `(match_id, user_id)` への複数回呼び出しは安全。`last_read_at` が上書きされるだけで副作用はない。

---

### 2-2. 新規 Server Action: `getTotalUnreadCountAction`

**ファイル:** `src/lib/actions/messages.ts`

```typescript
getTotalUnreadCountAction(): Promise<ActionResult<number>>
```

**処理フロー:**
1. `createServerClient()` でセッション取得
2. 自分の全マッチ ID を取得（`matches` テーブルから `or(user1_id.eq.${userId},user2_id.eq.${userId})`）
3. 自分の全既読レコードを一括取得:

```typescript
const { data: receipts } = await supabase
  .from('message_read_receipts')
  .select('match_id, last_read_at')
  .eq('user_id', userId)
// → Map<matchId, lastReadAt>
```

4. 全マッチの未読対象メッセージを一括取得:

```typescript
const { data: messages } = await supabase
  .from('messages')
  .select('match_id, sender_id, created_at')
  .in('match_id', matchIds)
  .neq('sender_id', userId)
  .not('sender_id', 'is', null)
```

5. JavaScript で合計未読数を計算:

```typescript
let total = 0
for (const msg of messages ?? []) {
  const lastRead = lastReadMap.get(msg.match_id)
  if (!lastRead || msg.created_at > lastRead) total++
}
return { data: total, error: null }
```

**クエリ数:** 合計 3 クエリ（matches + receipts + messages）。match 数に依存しない固定クエリ数。

---

### 2-3. 既存 Server Action の変更: `getMatchesAction`

**ファイル:** `src/lib/actions/matches.ts`

戻り値の `Match[]` に `unread_count` を追加する。処理フローは現行の末尾に以下を追加する:

```typescript
// 既存: matchIds, userId が確定済みの時点で追加
const { data: receipts } = await supabase
  .from('message_read_receipts')
  .select('match_id, last_read_at')
  .eq('user_id', userId)

const lastReadMap = new Map(
  receipts?.map((r) => [r.match_id, r.last_read_at]) ?? []
)

const { data: allMessages } = await supabase
  .from('messages')
  .select('match_id, sender_id, created_at')
  .in('match_id', matchIds)
  .neq('sender_id', userId)
  .not('sender_id', 'is', null)

const unreadCountMap = new Map<string, number>()
for (const msg of allMessages ?? []) {
  const lastRead = lastReadMap.get(msg.match_id)
  if (!lastRead || msg.created_at > lastRead) {
    unreadCountMap.set(msg.match_id, (unreadCountMap.get(msg.match_id) ?? 0) + 1)
  }
}
```

`Match` 組み立て時に `unread_count: unreadCountMap.get(match.id) ?? 0` を追加する。

**追加クエリ数:** 2 クエリ（receipts + messages）。既存の `getMatchesAction` に追加されるため、合計クエリ数は現行の 3 から 5 になる。

**破壊的変更:** `Match` 型に `unread_count` が追加される。TypeScript のビルドエラーで漏れなく検出可能。

---

## 3. 画面・UI 設計

### 3-1. BottomNav バッジ

**表示仕様:**

| 条件 | 表示 |
|---|---|
| `unreadCount === 0` | バッジを DOM に存在させない |
| `1 ≤ unreadCount ≤ 99` | 数字をそのまま表示（例: `3`）|
| `unreadCount > 99` | `99+` と表示 |

**バッジスタイリング:**

```tsx
// マッチングタブアイコンの外包要素
<div className="relative">
  <MessageCircle className="w-6 h-6" />
  {unreadCount > 0 && (
    <span className="
      absolute -top-1 -right-1
      min-w-[18px] h-[18px] px-1
      bg-gk-error text-white text-[10px] font-bold
      rounded-full flex items-center justify-center
      leading-none
    ">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</div>
```

`bg-gk-error`（`#E05252`）を使用する。gold（`#C9A84C`）は「学歴・アクティブ状態」専用のため通知バッジには使用しない。

---

### 3-2. MatchListItem バッジ

**表示仕様:** BottomNav バッジと同一の件数表示ルール（0 件非表示・99 超は「99+」）。

**バッジ配置:** 行右端の既存コンテンツ（最新メッセージプレビュー）の右横に配置する。

```tsx
// MatchListItem 行の右端エリア
<div className="flex flex-col items-end gap-1 shrink-0">
  {/* 既存: 省略記号などあれば維持 */}
  {unreadCount > 0 && (
    <span className="
      min-w-[20px] h-5 px-1.5
      bg-gk-error text-white text-[11px] font-bold
      rounded-full flex items-center justify-center
      leading-none
    ">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</div>
```

---

## 4. 既存コンポーネントの変更

### 4-1. `src/components/layout/BottomNav.tsx`

**変更内容:** Props を追加し、`useUnreadCount` フックを使用する。

```typescript
// 変更前
export function BottomNav() { ... }

// 変更後
type Props = {
  userId: string
  initialUnreadCount: number
}
export function BottomNav({ userId, initialUnreadCount }: Props) {
  const unreadCount = useUnreadCount(userId, initialUnreadCount)
  // ...
}
```

`(main)/layout.tsx` から `userId` と `initialUnreadCount` を Props として受け取る。`useUnreadCount` の詳細は「5. 新規フック」を参照。

---

### 4-2. `src/components/match/MatchListItem.tsx`

**変更内容:** `unreadCount` Props を追加する。

```typescript
// 変更前
type Props = {
  name: string
  university: string
  faculty: string
  lastMessage?: string | null
  avatarInitial: string
  avatarUrl?: string | null
  deleted?: boolean
  href: string
}

// 変更後（unreadCount を追加）
type Props = {
  name: string
  university: string
  faculty: string
  lastMessage?: string | null
  avatarInitial: string
  avatarUrl?: string | null
  deleted?: boolean
  href: string
  unreadCount?: number          // 追加。省略時は 0 として扱う
}
```

---

### 4-3. `src/components/chat/ChatView.tsx`

**変更内容:** マウント時に `markAsReadAction` を呼ぶ `useEffect` を追加する。

```typescript
// ChatView コンポーネント内に追加
useEffect(() => {
  markAsReadAction(matchId)
}, [matchId])
// matchId は変わらないため依存配列は [matchId] で十分。
// fire-and-forget で良い（エラーが起きても画面表示には影響しない）。
```

Realtime 受信時の既読マークは `useMessages` フック側で処理する（後述）。

---

### 4-4. `src/hooks/useMessages.ts`

**変更内容:** フックのシグネチャに `currentUserId` を追加し、相手からのメッセージ受信時に `markAsReadAction` を呼ぶ。

```typescript
// 変更前
export function useMessages(
  matchId: string,
  initialMessages: Message[]
): { messages: Message[]; addOptimistic: ...; rollbackOptimistic: ... }

// 変更後
export function useMessages(
  matchId: string,
  currentUserId: string,          // 追加
  initialMessages: Message[]
): { messages: Message[]; addOptimistic: ...; rollbackOptimistic: ... }
```

Realtime INSERT ハンドラー内で以下を追加:

```typescript
.on("postgres_changes", { event: "INSERT", ..., filter: `match_id=eq.${matchId}` },
  (payload) => {
    const newMsg = payload.new as Message
    // 既存の楽観的メッセージ置換ロジック...

    // 相手からのメッセージのみ既読マーク
    if (newMsg.sender_id && newMsg.sender_id !== currentUserId) {
      markAsReadAction(matchId)  // fire-and-forget
    }
  }
)
```

`ChatView.tsx` 内の `useMessages` 呼び出し箇所に `currentUserId` を追加で渡す。

---

### 4-5. `src/app/(main)/matches/page.tsx`

**変更内容:** `Match.unread_count` を `MatchListItem` の `unreadCount` Props に渡す。

```typescript
// 変更前
<MatchListItem
  name={...}
  lastMessage={match.last_message}
  // ...
/>

// 変更後
<MatchListItem
  name={...}
  lastMessage={match.last_message}
  unreadCount={match.unread_count}  // 追加
  // ...
/>
```

---

### 4-6. `src/app/(main)/layout.tsx`

**変更内容:** `getTotalUnreadCountAction` の呼び出しと `BottomNav` へのProps渡しを追加する。

```typescript
// 追加: 初期未読数取得
const user = await getUser()  // 既存のセッション取得処理
const { data: totalUnread } = await getTotalUnreadCountAction()

// BottomNav に Props を追加
<BottomNav
  userId={user.id}
  initialUnreadCount={totalUnread ?? 0}
/>
```

---

## 5. 新規フック: `useUnreadCount`

**ファイル:** `src/hooks/useUnreadCount.ts`

```typescript
export function useUnreadCount(
  userId: string,
  initialCount: number
): number
```

**実装方針:**

```typescript
export function useUnreadCount(userId: string, initialCount: number): number {
  const [count, setCount] = useState(initialCount)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel('unread-count-global')
      // 1. 新着メッセージ（他人から自分への）
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const msg = payload.new as { sender_id: string | null }
        if (msg.sender_id && msg.sender_id !== userId) {
          const result = await getTotalUnreadCountAction()
          if (result.data !== null) setCount(result.data)
        }
      })
      // 2. 既読マーク更新（自分の read_receipts が変わった）
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        const result = await getTotalUnreadCountAction()
        if (result.data !== null) setCount(result.data)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return count
}
```

**設計判断:**
- `messages` INSERT イベントで `sender_id` を確認し、自分の送信は無視する
- イベント受信のたびに `getTotalUnreadCountAction()` を再実行する（カウントのローカル増減は行わない）。これにより、複数タブ間の同期も `message_read_receipts` の変更イベント経由で自動解決する
- `messages` テーブルの Realtime イベントは `filter` なしで購読するため、自分が参加するすべてのマッチの新着を受信できる（RLS によって権限外のイベントはサーバー側でフィルタリングされる）

**チャット画面での二重購読について:**
`useMessages`（チャット画面）と `useUnreadCount`（BottomNav）がともに `messages` テーブルを購読する。これらは別々のチャンネル名（`match:${matchId}` と `unread-count-global`）を使用するため、Supabase のチャンネル管理上の競合は発生しない。

---

## 6. エラーハンドリング

### `markAsReadAction` の失敗

`markAsReadAction` は `ChatView` の `useEffect` と `useMessages` の Realtime ハンドラーから fire-and-forget で呼ぶ。失敗した場合でもチャット画面の表示には影響しない。ユーザーへのエラー表示は行わない。失敗時のリトライも行わない（次回チャット画面を開いたときに自然に再実行される）。

### `getTotalUnreadCountAction` の失敗

`useUnreadCount` フック内でのエラーは `count` の更新をスキップする（古い値を保持する）。BottomNav バッジが最新値でなくてもアプリの主要機能（チャット・マッチング）には影響しない。エラーをユーザーに表示しない。

### `getMatchesAction` の失敗（unread_count 追加後）

`message_read_receipts` または `messages` のクエリに失敗した場合、`unreadCountMap` が空 Map になる。`Match` 組み立て時に `unreadCountMap.get(match.id) ?? 0` を使うため、全マッチの `unread_count` が 0 になる（バッジが表示されない状態で一覧は表示される）。

### RLS による `message_read_receipts` 書き込み拒否

`markAsReadAction` 内の `is_match_participant(matchId)` チェックが false を返す場合（退会済みマッチ、または不正なアクセス）、RLS ポリシーによって UPSERT が拒否され `42501` エラーコードが返る。この場合 `{ data: null, error: "アクセス権限がありません" }` を返す。呼び出し側（ChatView / useMessages）はこのエラーを無視する。

---

## 7. 実装ファイル一覧と変更サマリー

| ファイル | 種別 | 変更内容 |
|---|---|---|
| `supabase/migrations/YYYYMMDD_message_read_receipts.sql` | 新規 | テーブル・RLS・インデックス・Realtime 設定 |
| `src/types/index.ts` | 変更 | `Match` 型に `unread_count: number` を追加 |
| `src/types/database.ts` | 再生成 | `supabase gen types typescript --local` で再実行 |
| `src/lib/actions/messages.ts` | 変更 | `markAsReadAction`・`getTotalUnreadCountAction` を追加 |
| `src/lib/actions/matches.ts` | 変更 | `getMatchesAction` に `unread_count` 計算を追加 |
| `src/hooks/useMessages.ts` | 変更 | `currentUserId` 引数追加・Realtime 既読マーク処理を追加 |
| `src/hooks/useUnreadCount.ts` | 新規 | 合計未読数の Realtime 購読フック |
| `src/components/layout/BottomNav.tsx` | 変更 | Props 追加・`useUnreadCount` 使用・バッジ UI 追加 |
| `src/components/match/MatchListItem.tsx` | 変更 | `unreadCount` Props 追加・バッジ UI 追加 |
| `src/components/chat/ChatView.tsx` | 変更 | マウント時 `markAsReadAction` 呼び出しを追加 |
| `src/app/(main)/matches/page.tsx` | 変更 | `unread_count` を `MatchListItem` に渡す |
| `src/app/(main)/layout.tsx` | 変更 | 初期未読数取得・`BottomNav` に Props を渡す |
