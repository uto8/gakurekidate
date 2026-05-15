# 未読バッジ機能 — 実装タスクリスト

最終更新: 2026-05-16（F-001〜F-011 完了）  
設計書: `docs/features/unread-badge/design.md`  
影響調査: `docs/features/unread-badge/impact.md`

---

## タスク一覧

| ID | タイトル | フェーズ | 依存 | 工数目安 | 状態 |
|---|---|---|---|---|---|
| F-001 | `message_read_receipts` マイグレーション作成 | データモデル | なし | 1.5h | ✅ 完了 |
| F-002 | `database.ts` 型再生成 | データモデル | F-001 | 0.5h | ✅ 完了 |
| F-003 | 互換性レイヤー導入（Match 型・useMessages） | 破壊的変更対応 | F-002 | 0.5h | ✅ 完了 |
| F-004 | `markAsReadAction` 実装 | バックエンド | F-001 | 1h | ✅ 完了 |
| F-005 | `getTotalUnreadCountAction` 実装 | バックエンド | F-001 | 1.5h | ✅ 完了 |
| F-006 | `getMatchesAction` に `unread_count` を追加 | バックエンド | F-003, F-004, F-005 | 1h | ✅ 完了 |
| F-007 | `useUnreadCount` フック新規作成 | フロントエンド基盤 | F-005 | 1.5h | ✅ 完了 |
| F-008 | `useMessages` に `currentUserId` と既読マーク処理を追加 | フロントエンド基盤 | F-003, F-004 | 1h | ✅ 完了 |
| F-009 | `layout.tsx` 更新 + `BottomNav` バッジ実装 | UI | F-006, F-007 | 1.5h | ✅ 完了 |
| F-010 | `MatchListItem` バッジ実装 + `matches/page.tsx` 更新 | UI | F-006 | 1h | ✅ 完了 |
| F-011 | `ChatView` に既読マーク追加 | UI | F-008 | 0.5h | ✅ 完了 |
| F-012 | 型確定（optional → required 変更） | 型確定 | F-009, F-010, F-011 | 0.5h | 未着手 |
| F-013 | `markAsReadAction` / `getTotalUnreadCountAction` ユニットテスト | テスト | F-004, F-005 | 2h | 未着手 |
| F-014 | `MatchListItem` / `BottomNav` コンポーネントテスト | テスト | F-009, F-010 | 1.5h | 未着手 |
| F-015 | 型チェック・ビルド確認・手動動作確認 | テスト | F-012 | 0.5h | 未着手 |

---

## フェーズ 1: データモデル変更

### F-001: `message_read_receipts` マイグレーション作成

**概要:** `message_read_receipts` テーブルを新規作成し、RLS・インデックス・Realtime 設定を行うマイグレーションファイルを作成する。

**依存:** なし

**作業内容:**

`supabase/migrations/20260515000004_message_read_receipts.sql` を新規作成し、以下を記述する。

```sql
-- テーブル作成
create table public.message_read_receipts (
  match_id     uuid        not null references public.matches(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- RLS 有効化
alter table public.message_read_receipts enable row level security;

-- SELECT: 自分のレコードのみ
create policy "read_receipts_select"
  on public.message_read_receipts for select
  using (user_id = auth.uid());

-- INSERT / UPDATE のみ（DELETE は意図的に除外）
-- is_match_participant() は既存の SECURITY DEFINER 関数を流用
create policy "read_receipts_write"
  on public.message_read_receipts for insert
  with check (user_id = auth.uid() and is_match_participant(match_id));

create policy "read_receipts_update"
  on public.message_read_receipts for update
  using  (user_id = auth.uid() and is_match_participant(match_id))
  with check (user_id = auth.uid() and is_match_participant(match_id));

-- インデックス
create index idx_read_receipts_user on public.message_read_receipts(user_id);

-- Realtime 設定
alter table public.message_read_receipts replica identity full;
alter publication supabase_realtime add table public.message_read_receipts;
```

**実装注意点（レビュー指摘事項）:**
- RLS は `for all` を使わず `for insert` / `for update` に分割する。`for all` は DELETE も含むため、ユーザーが自分の receipt を手動削除して未読状態を意図的にリセットできてしまう
- `for select` と `for insert/update` でポリシーを分離する。`is_match_participant` チェックは書き込みのみに適用し、SELECT は `user_id = auth.uid()` だけで十分

**完了条件:**
- `supabase/migrations/20260515000004_message_read_receipts.sql` が存在する
- `supabase start` 後に `supabase db reset` が成功する
- `psql` で `\d public.message_read_receipts` を実行し、PRIMARY KEY・FK・RLS 有効が確認できる
- `select * from pg_policies where tablename = 'message_read_receipts'` で `read_receipts_select`・`read_receipts_write`・`read_receipts_update` の 3 件が確認できる

**ロールバック:**
```sql
-- ローカル: supabase db reset で前の状態に戻す
-- 本番: Supabase SQL Editor で実行
drop table if exists public.message_read_receipts cascade;
```
アプリコードの変更はこの時点でないため、テーブル削除のみで完全ロールバック可能。

---

### F-002: `database.ts` 型再生成

**概要:** F-001 で追加したテーブルを反映するため `database.ts` を再生成する。

**依存:** F-001

**作業内容:**

```bash
supabase gen types typescript --local > src/types/database.ts
```

生成後、`Database['public']['Tables']['message_read_receipts']` の型定義が追加されていることを確認する。

**完了条件:**
- `src/types/database.ts` の `Tables` に `message_read_receipts` のキーが存在する
- `Row`・`Insert`・`Update` の 3 型が生成されている
- `npm run typecheck` がエラーなく通る

**ロールバック:**
```bash
git checkout src/types/database.ts
```
テーブルも F-001 のロールバック手順で削除する。

---

## フェーズ 2: 互換性レイヤー（破壊的変更への事前対応）

### F-003: 互換性レイヤー導入（`Match` 型・`useMessages`）

**概要:** このタスクは後続の破壊的変更を安全に導入するための準備。`Match` 型の新フィールドと `useMessages` の新引数を、まずオプショナルとして追加する。これにより F-004〜F-008 の変更を段階的にデプロイしても既存ビルドが壊れない。

**依存:** F-002

**作業内容:**

`src/types/index.ts`:
```typescript
type Match = {
  id: string
  partner: Profile
  created_at: string
  last_message: string | null
  unread_count?: number   // 互換性レイヤー: optional。F-012 で required に変更する
}
```

`src/hooks/useMessages.ts` のシグネチャ:
```typescript
// currentUserId をオプショナルで追加（F-008 で必須化する前の互換性確保）
export function useMessages(
  matchId: string,
  currentUserId: string | undefined,  // 互換性レイヤー: F-012 で string に変更
  initialMessages: Message[]
)
// currentUserId が undefined の場合、markAsReadAction を呼ばない（F-008 で実装）
```

**完了条件:**
- `npm run typecheck` がエラーなく通る
- `getMatchesAction` の戻り値に `unread_count` がなくても TypeScript エラーが出ない（optional のため）
- 既存の `ChatView.tsx` が `useMessages` のシグネチャ変更後もコンパイルエラーにならない

**ロールバック:**
```bash
git revert <F-003 のコミットハッシュ>
```
DB に変更はないため、コードのみをリバートする。

---

## フェーズ 3: バックエンド

### F-004: `markAsReadAction` 実装

**概要:** 指定した match を現在時刻で既読マークする Server Action を実装する。

**依存:** F-001

**作業場所:** `src/lib/actions/messages.ts`

**作業内容:**

```typescript
export async function markAsReadAction(
  matchId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: "unauthorized" }

  // match 参加者確認（RLS に加えてアプリ層でも確認）
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()
  if (!match) return { data: null, error: "forbidden" }

  const { error } = await supabase
    .from('message_read_receipts')
    .upsert(
      { match_id: matchId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: 'match_id,user_id' }
    )
  // Supabase JS の upsert は ON CONFLICT DO UPDATE を生成するが、
  // last_read_at の巻き戻しを防ぐため SQL レベルで GREATEST を使うよう
  // RPC に変更することを F-004 完了後に検討する
  if (error) return { data: null, error: supabaseErrorToMessage(error) }

  return { data: null, error: null }
}
```

**実装注意点（レビュー指摘事項）:**
- Supabase JS の `.upsert()` は `DO UPDATE SET last_read_at = EXCLUDED.last_read_at` を生成する。複数タブから同時に呼ばれた場合に古い `now()` で上書きされるリスクが残る。MVP では許容するが、本番ではマイグレーションに以下を追加してカバーすること:
  ```sql
  -- F-001 のマイグレーションに追記するか、追加マイグレーションで対応
  create or replace function public.upsert_read_receipt(
    p_match_id uuid, p_user_id uuid, p_read_at timestamptz
  ) returns void language sql security definer as $$
    insert into public.message_read_receipts(match_id, user_id, last_read_at)
    values (p_match_id, p_user_id, p_read_at)
    on conflict (match_id, user_id)
    do update set last_read_at = greatest(
      message_read_receipts.last_read_at, excluded.last_read_at
    );
  $$;
  ```
  MVP では Supabase JS の upsert で進め、この RPC 追加は技術的負債として `docs/features/unread-badge/design.md` の未解決事項に追記する

**完了条件:**
- `markAsReadAction('存在するmatchId')` を呼ぶと `{ data: null, error: null }` が返る
- `message_read_receipts` に `(matchId, userId)` のレコードが UPSERT されている
- `markAsReadAction('存在しないmatchId')` を呼ぶと `{ data: null, error: "forbidden" }` が返る
- 同一 `(matchId, userId)` を 2 回呼んでもエラーにならない（冪等性）

**ロールバック:**
```bash
git revert <F-004 のコミットハッシュ>
```
DB のテーブルは残るが、アクション自体がなくなるため呼び出し側（F-008・F-011）から先にロールバックする。

---

### F-005: `getTotalUnreadCountAction` 実装

**概要:** ログインユーザーの全マッチを横断した合計未読数を返す Server Action を実装する。

**依存:** F-001

**作業場所:** `src/lib/actions/messages.ts`

**作業内容:**

```typescript
export async function getTotalUnreadCountAction(
  userId?: string  // layout.tsx から getUser() の結果を渡すことで二重取得を回避
): Promise<ActionResult<number>> {
  const supabase = await createServerClient()

  let uid = userId
  if (!uid) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { data: null, error: "unauthorized" }
    uid = user.id
  }

  // Step 1: 自分の全マッチ ID を取得
  const { data: matchRows, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
  if (matchError) return { data: null, error: supabaseErrorToMessage(matchError) }

  const matchIds = matchRows?.map(m => m.id) ?? []

  // マッチが 0 件のユーザー（新規登録直後）への対応
  if (matchIds.length === 0) return { data: 0, error: null }

  // Step 2: 自分の全既読レコードを取得
  const { data: receipts, error: receiptError } = await supabase
    .from('message_read_receipts')
    .select('match_id, last_read_at')
    .eq('user_id', uid)
  if (receiptError) return { data: null, error: supabaseErrorToMessage(receiptError) }

  const lastReadMap = new Map(
    receipts?.map(r => [r.match_id, r.last_read_at]) ?? []
  )

  // Step 3: 全マッチの未読対象メッセージを一括取得
  // 既知の制約: created_at フィルタなしで全件取得しているため、
  // マッチ数 × メッセージ数に比例してペイロードが増加する。
  // MVP の想定ユーザー規模（マッチ数 < 50, メッセージ数/マッチ < 200）では許容範囲。
  // ユーザー数増加時は PostgreSQL 関数（RPC）化を検討する。
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('match_id, sender_id, created_at')
    .in('match_id', matchIds)
    .neq('sender_id', uid)
    .not('sender_id', 'is', null)
  if (msgError) return { data: null, error: supabaseErrorToMessage(msgError) }

  // Step 4: JavaScript で合計未読数を計算
  let total = 0
  for (const msg of messages ?? []) {
    const lastRead = lastReadMap.get(msg.match_id)
    if (!lastRead || msg.created_at > lastRead) total++
  }

  return { data: total, error: null }
}
```

**実装注意点（レビュー指摘事項）:**
- `matchIds.length === 0` のガードを必ず入れる。Supabase JS で `.in('column', [])` を呼ぶと `WHERE column IN ()` となり、DB エラーまたは予期しない全件取得が起きる
- `userId` を引数で受け取れるようにする。`layout.tsx` からは `getUser()` の結果を渡して二重セッション取得を回避する

**完了条件:**
- マッチが 0 件のユーザーで呼ぶと `{ data: 0, error: null }` が返る
- 未読メッセージが 3 件のユーザーで呼ぶと `{ data: 3, error: null }` が返る
- `markAsReadAction` 後に呼ぶと既読マークしたマッチの分が差し引かれた値が返る
- 未認証状態で呼ぶと `{ data: null, error: "unauthorized" }` が返る

**ロールバック:**
```bash
git revert <F-005 のコミットハッシュ>
```
F-007（useUnreadCount）や F-009（layout.tsx）が先にデプロイ済みの場合は、それらを先にロールバックしてから本タスクをロールバックする。

---

### F-006: `getMatchesAction` に `unread_count` を追加

**概要:** 既存の `getMatchesAction` に未読数の計算を追加し、`Match` 型の `unread_count` フィールドを埋めて返す。

**依存:** F-003（互換性レイヤー）, F-004, F-005

**作業場所:** `src/lib/actions/matches.ts`

**作業内容:**

既存の `getMatchesAction` の末尾（`Match[]` を組み立てる直前）に以下を追加する。

```typescript
// 既存の matchIds, userId が確定した後に追加
// 空チェックは getTotalUnreadCountAction と同様に必要
const unreadCountMap = new Map<string, number>()
if (matchIds.length > 0) {
  const { data: receipts } = await supabase
    .from('message_read_receipts')
    .select('match_id, last_read_at')
    .eq('user_id', userId)

  const lastReadMap = new Map(
    receipts?.map(r => [r.match_id, r.last_read_at]) ?? []
  )

  const { data: allMessages } = await supabase
    .from('messages')
    .select('match_id, sender_id, created_at')
    .in('match_id', matchIds)
    .neq('sender_id', userId)
    .not('sender_id', 'is', null)

  for (const msg of allMessages ?? []) {
    const lastRead = lastReadMap.get(msg.match_id)
    if (!lastRead || msg.created_at > lastRead) {
      unreadCountMap.set(msg.match_id, (unreadCountMap.get(msg.match_id) ?? 0) + 1)
    }
  }
}

// Match 組み立て時に追加
// unread_count: unreadCountMap.get(match.id) ?? 0
```

クエリが失敗（receipts または messages が null）した場合は `unreadCountMap` が空 Map のまま進み、全マッチの `unread_count` が 0 になる（バッジ非表示）。マッチ一覧の表示自体は影響しない。

**完了条件:**
- `getMatchesAction()` の戻り値の各 `Match` に `unread_count` が含まれている
- 未読が 2 件あるマッチの `unread_count` が `2` である
- `npm run typecheck` がエラーなく通る
- `/matches` ページが引き続き正常に表示される

**ロールバック:**
```bash
git revert <F-006 のコミットハッシュ>
```
`Match.unread_count` は F-003 でオプショナルのため、ロールバック後もビルドは壊れない。F-010（MatchListItem への prop 渡し）が先にデプロイ済みの場合も、`unreadCount={match.unread_count}` が `undefined` を渡すだけでバッジが非表示になる（許容範囲）。

---

## フェーズ 4: フロントエンド基盤

### F-007: `useUnreadCount` フック新規作成

**概要:** BottomNav 用の合計未読数をリアルタイム管理するカスタムフックを新規作成する。

**依存:** F-005

**作業場所:** `src/hooks/useUnreadCount.ts`（新規ファイル）

**作業内容:**

```typescript
import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { getTotalUnreadCountAction } from '@/lib/actions/messages'
import type { Message } from '@/types'

export function useUnreadCount(userId: string, initialCount: number): number {
  const [count, setCount] = useState(initialCount)
  // createBrowserClient() をレンダリングのたびに呼ばないよう useRef で固定する
  const supabaseRef = useRef(createBrowserClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const refresh = async () => {
      const result = await getTotalUnreadCountAction(userId)
      if (result.data !== null) setCount(result.data)
    }

    const channel = supabase
      .channel('unread-count-global')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Pick<Message, 'sender_id'>
        // 自分の送信は無視する
        if (msg.sender_id && msg.sender_id !== userId) {
          refresh()
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return count
}
```

**実装注意点（レビュー指摘事項）:**
- `createBrowserClient()` は `useRef` で固定する。コンポーネントの再レンダリングのたびに新しいクライアントが生成され、`useEffect` の依存配列との不整合が起きるため
- `messages` テーブルに `filter` を指定しない理由: RLS が `messages_select` ポリシーで自分が参加するマッチのメッセージのみ配信するため。ただしこれは Supabase Realtime の `replica identity full` が前提であり、すでに `messages` テーブルに設定済みであることを確認すること

**完了条件:**
- フックを使用するコンポーネントをマウントした後に相手がメッセージを送ると、`count` が増加する
- `markAsReadAction` を呼んで既読マークすると、`message_read_receipts` の変更イベント経由で `count` が更新される
- コンポーネントをアンマウントすると Realtime チャンネルが解除される（`removeChannel` が呼ばれる）
- `npm run typecheck` がエラーなく通る

**ロールバック:**
```bash
git revert <F-007 のコミットハッシュ>
```
F-009（BottomNav）が先にデプロイ済みの場合は、F-009 を先にロールバックしてから本タスクをロールバックする。

---

### F-008: `useMessages` に `currentUserId` と既読マーク処理を追加

**概要:** `useMessages` に `currentUserId` 引数を追加し、相手からのメッセージを Realtime で受信したときに `markAsReadAction` を呼び出す処理を追加する。

**依存:** F-003（互換性レイヤー）, F-004

**作業場所:** `src/hooks/useMessages.ts`

**作業内容:**

シグネチャ変更（F-003 で `string | undefined` に変更済みのものを実装する）:
```typescript
export function useMessages(
  matchId: string,
  currentUserId: string | undefined,  // F-012 で string に変更する
  initialMessages: Message[]
)
```

Realtime INSERT ハンドラー内に追加:
```typescript
(payload) => {
  const newMsg = payload.new as Message
  // 既存の楽観的メッセージ置換ロジック（変更なし）...

  // 相手からのメッセージのみ既読マーク（自分の送信・退会済みユーザーは除外）
  if (currentUserId && newMsg.sender_id && newMsg.sender_id !== currentUserId) {
    markAsReadAction(matchId)  // fire-and-forget。失敗時はコンソールエラーのみ
      .then(result => {
        if (result.error) console.error('[markAsReadAction]', result.error)
      })
  }
}
```

`ChatView.tsx` の `useMessages` 呼び出し箇所に `currentUserId` を追加で渡す:
```typescript
const { messages, addOptimistic, rollbackOptimistic } = useMessages(
  matchId,
  currentUserId,  // 追加
  initialMessages
)
```

**完了条件:**
- チャット画面を開いている状態で相手がメッセージを送ると、Realtime 受信後に `message_read_receipts` が更新される
- 自分がメッセージを送った場合（`sender_id === currentUserId`）は `markAsReadAction` が呼ばれない
- `npm run typecheck` がエラーなく通る
- 既存のチャット送受信機能（楽観的 UI・Realtime 反映）が引き続き正常に動作する

**ロールバック:**
```bash
git revert <F-008 のコミットハッシュ>
```
F-003 の互換性レイヤーにより `currentUserId` がオプショナルのため、ロールバック後も `ChatView.tsx` のコンパイルエラーは発生しない。

---

## フェーズ 5: UI

### F-009: `layout.tsx` 更新 + `BottomNav` バッジ実装

**概要:** `(main)/layout.tsx` で初期未読数を取得して `BottomNav` に渡し、`BottomNav` に未読バッジ UI を実装する。

**依存:** F-006, F-007

**作業場所:**
- `src/app/(main)/layout.tsx`
- `src/components/layout/BottomNav.tsx`

**`layout.tsx` の変更内容:**

```typescript
// 既存の getUser() 呼び出しに続けて追加（二重セッション取得を回避するため userId を渡す）
const user = await getUser()  // 既存処理
const { data: totalUnread } = await getTotalUnreadCountAction(user?.id)

// BottomNav の Props を変更
<BottomNav
  userId={user?.id ?? ''}
  initialUnreadCount={totalUnread ?? 0}
/>
```

**`BottomNav.tsx` の変更内容:**

```typescript
type Props = {
  userId: string
  initialUnreadCount: number
}

export function BottomNav({ userId, initialUnreadCount }: Props) {
  const unreadCount = useUnreadCount(userId, initialUnreadCount)
  // ...

  // マッチングタブのアイコン部分
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
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
  </div>
}
```

**完了条件:**
- `/discover` ページを開いたとき、未読が 2 件あれば BottomNav の「マッチング」タブに「2」バッジが表示される
- 未読が 0 件のとき、バッジが DOM 上に存在しない（`{unreadCount > 0 && ...}` による）
- 未読が 100 件のとき「99+」と表示される
- BottomNav バッジは JavaScript 無効時には表示されないが（Client Component のため）、初回 HTML レスポンスに `initialUnreadCount` が含まれている
- `npm run typecheck` と `npm run build` がエラーなく通る

**ロールバック:**
```bash
git revert <F-009 のコミットハッシュ>
```
`Match.unread_count` は F-003 でオプショナルのためビルドは壊れない。`layout.tsx` は既存の `getUser()` が変わらない点に注意。

---

### F-010: `MatchListItem` バッジ実装 + `matches/page.tsx` 更新

**概要:** `MatchListItem` に `unreadCount` Props を追加してバッジ UI を実装し、`matches/page.tsx` から `Match.unread_count` を渡す。

**依存:** F-006

**作業場所:**
- `src/components/match/MatchListItem.tsx`
- `src/app/(main)/matches/page.tsx`

**`MatchListItem.tsx` の変更内容:**

```typescript
type Props = {
  // 既存の Props は変更しない
  name: string
  university: string
  faculty: string
  lastMessage?: string | null
  avatarInitial: string
  avatarUrl?: string | null
  deleted?: boolean
  href: string
  unreadCount?: number  // 追加。省略時は 0 として扱う
}

// 行の右端エリアに追加
{(unreadCount ?? 0) > 0 && (
  <span className="
    min-w-[20px] h-5 px-1.5
    bg-gk-error text-white text-[11px] font-bold
    rounded-full flex items-center justify-center
    leading-none shrink-0
  ">
    {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
  </span>
)}
```

**`matches/page.tsx` の変更内容:**

```typescript
<MatchListItem
  // 既存の Props
  name={...}
  lastMessage={match.last_message}
  // ...
  unreadCount={match.unread_count}  // 追加
/>
```

**完了条件:**
- `/matches` ページを開いたとき、未読 3 件のチャット行に「3」バッジが表示される
- 未読 0 件の行にバッジが表示されない
- `/chat/[matchId]` から戻った後に `/matches` を再表示すると、当該チャットのバッジが消えている（Server Component の再レンダリングによる）
- `npm run typecheck` がエラーなく通る

**ロールバック:**
```bash
git revert <F-010 のコミットハッシュ>
```
`unreadCount` は optional のため、ロールバック後も `matches/page.tsx` の呼び出し元のビルドは壊れない。

---

### F-011: `ChatView` に既読マーク追加

**概要:** チャット画面を開いた瞬間に `markAsReadAction` を呼ぶ `useEffect` を追加する。

**依存:** F-008（`useMessages` の既読マーク処理が完了していること）

**作業場所:** `src/components/chat/ChatView.tsx`

**作業内容:**

```typescript
// ChatView コンポーネント内に追加（既存の useEffect とは独立して配置）
useEffect(() => {
  markAsReadAction(matchId)
    .then(result => {
      if (result.error) console.error('[markAsReadAction on mount]', result.error)
    })
}, [matchId])
// matchId は URL パラメータから来るため変わらない。依存配列は [matchId] で十分。
```

**完了条件:**
- `/chat/[matchId]` を開いた直後に `message_read_receipts` の `(matchId, userId)` レコードが UPSERT されている
- チャットを開いた後 `/matches` に戻ると、当該チャットの per-chat バッジが消えている
- チャットを開いた後 BottomNav バッジの件数が当該チャットの未読分だけ減っている
- 既存のメッセージ表示・送受信機能に影響がない

**ロールバック:**
```bash
git revert <F-011 のコミットハッシュ>
```
`markAsReadAction` の呼び出しが消えるだけ。DB のレコードは残るため、未読バッジの件数が正確でなくなるが、アプリの主要機能は継続して動作する。

---

## フェーズ 6: 型確定

### F-012: `Match.unread_count` と `useMessages.currentUserId` を必須に変更

**概要:** F-003 で互換性確保のためオプショナルにしていた 2 つの定義を、すべての呼び出し側が更新完了した時点で必須に変更する。TypeScript のビルドを通して漏れなく確認する。

**依存:** F-009, F-010, F-011

**作業内容:**

`src/types/index.ts`:
```typescript
type Match = {
  id: string
  partner: Profile
  created_at: string
  last_message: string | null
  unread_count: number  // optional を外して必須に変更
}
```

`src/hooks/useMessages.ts`:
```typescript
export function useMessages(
  matchId: string,
  currentUserId: string,  // string | undefined を string に変更
  initialMessages: Message[]
)
```

**完了条件:**
- `npm run typecheck` がエラーなく通る
- `npm run build` がエラーなく通る
- `getMatchesAction()` の呼び出し箇所で `unread_count` が欠落していたら TypeScript エラーが出る（ビルドで検出可能）

**ロールバック:**
```bash
git revert <F-012 のコミットハッシュ>
```
optional に戻すだけ。ランタイムの動作には影響しない。

---

## フェーズ 7: テスト

### F-013: `markAsReadAction` / `getTotalUnreadCountAction` ユニットテスト

**概要:** 2 つの新規 Server Action の動作をユニットテストで検証する。

**依存:** F-004, F-005

**作業場所:** `src/lib/__tests__/unreadActions.test.ts`（新規ファイル）

**テストケース:**

`markAsReadAction`:
1. 参加者が呼ぶと `message_read_receipts` にレコードが作成される
2. 同一 `(matchId, userId)` を 2 回呼んでもレコードが 1 件のみ（UPSERT の冪等性）
3. 非参加者が呼ぶと `{ data: null, error: "forbidden" }` が返る
4. 未認証で呼ぶと `{ data: null, error: "unauthorized" }` が返る

`getTotalUnreadCountAction`:
1. マッチが 0 件のユーザーで呼ぶと `{ data: 0 }` が返る（空配列ガード）
2. 未読 3 件のユーザーで呼ぶと `{ data: 3 }` が返る
3. `markAsReadAction` 後に呼ぶと既読分が差し引かれた値が返る
4. 自分が送ったメッセージは未読カウントに含まれない
5. `sender_id IS NULL`（退会済みユーザーのメッセージ）は未読カウントに含まれない
6. 未認証で呼ぶと `{ data: null, error: "unauthorized" }` が返る

**完了条件:**
- `npx vitest run src/lib/__tests__/unreadActions.test.ts` がすべて PASS する

**ロールバック:**
テストファイルのみ。本体コードに影響しないため、必要であれば `git rm` で削除。

---

### F-014: `MatchListItem` / `BottomNav` コンポーネントテスト

**概要:** バッジの表示・非表示ロジックをコンポーネントテストで検証する。

**依存:** F-009, F-010

**作業場所:** `src/components/__tests__/UnreadBadge.test.tsx`（新規ファイル）

**テストケース:**

`MatchListItem`:
1. `unreadCount={3}` を渡すと「3」バッジが表示される
2. `unreadCount={0}` を渡すとバッジが表示されない
3. `unreadCount` を省略するとバッジが表示されない
4. `unreadCount={100}` を渡すと「99+」バッジが表示される

`BottomNav`:
1. `initialUnreadCount={2}` を渡すと「2」バッジが表示される（`useUnreadCount` のフックは静的モックで代替）
2. `initialUnreadCount={0}` を渡すとバッジが表示されない
3. アクティブタブ（マッチング）のバッジと非アクティブタブのバッジが共存する

**完了条件:**
- `npx vitest run src/components/__tests__/UnreadBadge.test.tsx` がすべて PASS する

**ロールバック:**
テストファイルのみ。`git rm` で削除。

---

### F-015: 型チェック・ビルド確認・手動動作確認

**概要:** 全タスク完了後にビルドとTypeScriptチェックを通し、主要な動線を手動で確認する。

**依存:** F-012（全フェーズ完了後）

**作業内容:**

```bash
npm run typecheck  # tsc --noEmit
npm run build      # 本番ビルド確認
npm run dev        # 開発サーバーで手動確認
```

**手動確認チェックリスト:**
- [ ] 未読メッセージがある状態で `/discover` を開くと BottomNav バッジに件数が表示される
- [ ] `/chat/[matchId]` を開くと BottomNav バッジの件数が減る
- [ ] `/matches` に戻ると既読にしたチャット行のバッジが消えている
- [ ] チャット画面を開いている状態で相手がメッセージを送ると自動既読になる（BottomNav バッジが増えない）
- [ ] マッチが 0 件の新規ユーザーで `/discover` を開いてもエラーが起きない
- [ ] 未読 100 件超の状態で「99+」が表示される

**完了条件:**
- `npm run typecheck` がエラー 0 件
- `npm run build` が成功する
- 上記チェックリストが全項目 ✅

**ロールバック:**
このタスク自体にコード変更はない。問題があれば問題のあるタスクのコミットまでロールバックする。

---

## 依存グラフ（実装順）

```
F-001 (migration)
  └─ F-002 (type regen)
       └─ F-003 (compat layer)
            ├─ F-004 (markAsReadAction)
            │    ├─ F-008 (useMessages)
            │    │    └─ F-011 (ChatView)
            │    └─ F-013 (unit tests)
            └─ F-005 (getTotalUnreadCountAction)
                 ├─ F-006 (getMatchesAction)
                 │    ├─ F-009 (layout + BottomNav)
                 │    │    └─ F-014 (component tests)
                 │    └─ F-010 (MatchListItem + page)
                 │         └─ F-014 (component tests)
                 └─ F-007 (useUnreadCount)
                      └─ F-009 (layout + BottomNav)

F-009 + F-010 + F-011 → F-012 (型確定) → F-015 (確認)
```

## 既知の技術的負債（実装後に残るリスク）

| ID | 内容 | 優先度 | 対応タイミング |
|---|---|---|---|
| TD-1 | `getTotalUnreadCountAction` / `getMatchesAction` がメッセージを上限なし全件取得する。マッチ数 × メッセージ数に比例してペイロードが増加する | High | MAU 1,000 超またはメッセージ数/マッチが 500 超になる前に PostgreSQL 関数（RPC）化 |
| TD-2 | `markAsReadAction` の UPSERT が `GREATEST` を使っていない。複数タブ同時操作で古い `last_read_at` に上書きされる理論的リスクがある | Low | RPC 化と同時に対応 |
| TD-3 | `useUnreadCount` フックが `getTotalUnreadCountAction` / `createBrowserClient` を直接参照しており、依存性注入がないためユニットテストが困難 | Medium | フックの安定後にリファクタリング |
