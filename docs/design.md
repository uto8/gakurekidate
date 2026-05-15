# 技術設計書 — 学歴マッチングアプリ（gakureki-date）

最終更新: 2026-05-14

---

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────┐
│              ブラウザ (Client)            │
│  Next.js App Router                     │
│  ┌──────────────┬──────────────────┐    │
│  │ Server Comp. │  Client Comp.    │    │
│  │ (SSR/fetch)  │  (Realtime/UI)   │    │
│  └──────┬───────┴────────┬─────────┘    │
└─────────│────────────────│─────────────┘
          │ HTTPS           │ WebSocket (Supabase Realtime)
          ▼                ▼
┌─────────────────────────────────────────┐
│              Supabase                   │
│  ┌─────────┬──────────┬──────────────┐  │
│  │  Auth   │ Postgres │   Storage    │  │
│  │(JWT/RLS)│(RLS 全表)│(プロフィール写真)│  │
│  └─────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│     Vercel      │
│ (Next.js Deploy)│
└─────────────────┘
```

### 設計方針

| 方針 | 内容 |
|---|---|
| **BFF なし** | Next.js の Route Handler (`app/api/`) を薄いアダプター層として使用し、ビジネスロジックは Supabase RLS と PostgreSQL 制約に委ねる |
| **Server Components ファースト** | 初期データ取得は Server Components で行い、インタラクティブな部分だけ Client Components に切り出す |
| **Realtime は最小限** | チャット画面のみ WebSocket 購読。その他の画面は SSR + `revalidatePath` で対応 |
| **RLS で多層防御** | アプリ側のガードが突破されても Supabase RLS が不正アクセスをブロックする |

---

## 2. 技術スタック

| レイヤー | 選択 | 代替案と不採用理由 |
|---|---|---|
| フロントエンド | **Next.js 15（App Router）** | Remix → Vercel との統合優位性が劣る。Vite+React → SSR が別途必要になる |
| 言語 | **TypeScript** | JavaScript → Supabase 生成型との組み合わせで DB スキーマ変更をコンパイル時に検出できるため必須 |
| スタイリング | **Tailwind CSS v4** | styled-components → ランタイムコストあり。CSS Modules → レスポンシブ対応に記述量が増える |
| UI コンポーネント | **shadcn/ui** | MUI → バンドルサイズが大きい。独自実装 → MVP では過剰投資 |
| バックエンド / DB | **Supabase（PostgreSQL）** | Firebase → SQL 不可・複雑な JOIN ができない。PlanetScale+手製API → 追加インフラ管理コストが生じる |
| 認証 | **Supabase Auth** | NextAuth.js → Supabase RLS との JWT 連携を自前で実装する必要がある |
| ファイルストレージ | **Supabase Storage** | S3+CloudFront → Supabase RLS と同一ポリシーで「本人のみ上書き可」を実現できる利点がなくなる |
| リアルタイム | **Supabase Realtime** | Socket.io → 追加サーバーが必要。Pusher → 有料枠に依存 |
| デプロイ | **Vercel** | Render → Next.js の Edge Functions 対応が弱い |
| パッケージ管理 | **npm** | yarn / pnpm → 他プロジェクトとの統一優先 |

---

## 3. ディレクトリ構成

```
gakureki-date/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # 未認証ルートグループ（ミドルウェア対象外）
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (main)/                    # 認証済みルートグループ
│   │   │   ├── layout.tsx             # ナビゲーションバー、認証ガード、education 未登録チェック
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx           # プロフィール＋学歴の初期入力（両方完了で /discover へ）
│   │   │   ├── discover/
│   │   │   │   └── page.tsx           # 異性一覧・年齢／大学フィルター
│   │   │   ├── likes/
│   │   │   │   └── page.tsx           # 受信いいね一覧
│   │   │   ├── matches/
│   │   │   │   └── page.tsx           # マッチング一覧
│   │   │   ├── chat/
│   │   │   │   └── [matchId]/
│   │   │   │       └── page.tsx       # チャット画面（Realtime 購読）
│   │   │   └── profile/
│   │   │       ├── edit/
│   │   │       │   └── page.tsx       # 自分のプロフィール編集
│   │   │       └── [userId]/
│   │   │           └── page.tsx       # 他者プロフィール詳細
│   │   ├── api/
│   │   │   ├── likes/
│   │   │   │   └── route.ts           # POST: いいね送信（マッチング自動判定）
│   │   │   └── account/
│   │   │       └── route.ts           # DELETE: 退会（ソフトデリート）
│   │   ├── layout.tsx                 # ルートレイアウト、SupabaseProvider
│   │   └── page.tsx                   # トップ（未認証→ランディング / 認証済み→/discover）
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui ベース汎用プリミティブ
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Avatar.tsx
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx        # 探索一覧のカード（名前・年齢・学歴・いいねボタン）
│   │   │   ├── ProfileDetail.tsx      # プロフィール詳細表示
│   │   │   └── EducationBadge.tsx     # 学歴バッジ（大学名・学部・卒業年度）
│   │   ├── like/
│   │   │   └── LikeButton.tsx         # いいね送信 → API 呼び出し → MatchBanner 連携
│   │   ├── match/
│   │   │   └── MatchBanner.tsx        # マッチング成立バナー（React state で管理）
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx         # メッセージ一覧＋入力欄（Realtime 購読）
│   │   │   ├── ChatHeader.tsx         # 相手の名前・学歴表示、退会済み判定
│   │   │   └── MessageBubble.tsx      # 自分 / 相手 / 退会済みユーザーの表示分岐
│   │   └── discover/
│   │       ├── UserGrid.tsx           # プロフィールカード一覧グリッド
│   │       └── FilterPanel.tsx        # 年齢フィルター・大学名キーワード検索 UI
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # ログインユーザー取得
│   │   ├── useMessages.ts             # Realtime 購読＋メッセージ送信
│   │   └── useMatchBanner.ts          # マッチング通知状態管理（React state のみ）
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # createBrowserClient()
│   │   │   ├── server.ts              # createServerClient()（cookies 経由）
│   │   │   └── database.types.ts      # `supabase gen types` で自動生成
│   │   ├── actions/                   # Server Actions
│   │   │   ├── auth.ts
│   │   │   ├── profile.ts
│   │   │   ├── likes.ts
│   │   │   ├── matches.ts
│   │   │   └── messages.ts
│   │   └── utils.ts                   # cn(), calcAge(), supabaseErrorToMessage()
│   │
│   └── types/
│       └── index.ts                   # アプリ固有の型エイリアス
│
├── middleware.ts                      # 未認証リダイレクト
├── supabase/
│   ├── migrations/                    # SQL マイグレーションファイル（時系列管理）
│   └── seed.sql                       # 開発用シードデータ
├── docs/
│   ├── requirements.md
│   ├── data-model.md
│   └── design.md                      # 本ファイル
└── public/
```

---

## 4. データモデル詳細

### 4-1. テーブル定義（DDL）

```sql
-- プロフィール
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  birth_date  date        not null check (birth_date <= current_date - interval '18 years'),
  gender      text        not null check (gender in ('male', 'female')),
  bio         text,
  photo_url   text,
  deleted_at  timestamptz,                -- NULL = 有効, NOT NULL = 退会済み（ソフトデリート）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 学歴（プロフィールと 1:1 必須）
create table public.educations (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references public.profiles(id) on delete cascade,
  university      text        not null,
  faculty         text        not null,
  graduation_year integer     not null check (graduation_year between 1950 and 2100),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- いいね
create table public.likes (
  id           uuid        primary key default gen_random_uuid(),
  from_user_id uuid        not null references public.profiles(id) on delete cascade,
  to_user_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

-- マッチング
create table public.matches (
  id         uuid        primary key default gen_random_uuid(),
  user1_id   uuid        not null references public.profiles(id) on delete cascade,
  user2_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)  -- UUID の小さい方を user1 に強制（重複登録防止）
);

-- メッセージ
create table public.messages (
  id         uuid        primary key default gen_random_uuid(),
  match_id   uuid        not null references public.matches(id) on delete cascade,
  sender_id  uuid        references public.profiles(id) on delete set null,  -- 退会時 SET NULL
  content    text        not null check (length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- 既読管理（未読バッジ機能）→ 詳細: docs/features/unread-badge/design.md
-- message_read_receipts テーブル: (match_id, user_id) PK、last_read_at で既読時刻を管理
-- マイグレーション: supabase/migrations/YYYYMMDD_message_read_receipts.sql で追加
```

### 4-2. ビュー

```sql
-- 年齢を動的計算するビュー（探索・フィルター・表示に使用）
create or replace view public.profiles_with_age as
select
  p.*,
  e.university,
  e.faculty,
  e.graduation_year,
  date_part('year', age(p.birth_date))::integer as age
from public.profiles p
left join public.educations e on e.user_id = p.id;
```

### 4-3. RLS ポリシー

```sql
-- 全テーブルで RLS 有効化
alter table public.profiles   enable row level security;
alter table public.educations enable row level security;
alter table public.likes      enable row level security;
alter table public.matches    enable row level security;
alter table public.messages   enable row level security;

-- profiles: 退会済みユーザーは本人以外に見えない
create policy "profiles_select"
  on public.profiles for select
  using (deleted_at is null or auth.uid() = id);

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

-- educations: 全員が参照可能（学歴は公開情報）、書き込みは本人のみ
create policy "educations_select"
  on public.educations for select
  using (true);

create policy "educations_insert_update"
  on public.educations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- likes: 自分が関与するもののみ参照、送信は本人のみ
create policy "likes_select"
  on public.likes for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "likes_insert"
  on public.likes for insert
  with check (auth.uid() = from_user_id);

-- matches: 当事者のみ参照
create policy "matches_select"
  on public.matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- messages: マッチした相手のみ読み書き可
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );
```

### 4-4. インデックス

```sql
-- 探索フィルター（gender + birth_date で年齢範囲検索）
create index idx_profiles_gender_birth  on public.profiles(gender, birth_date) where deleted_at is null;

-- 大学名キーワード検索（ILIKE 対応）
create index idx_educations_university  on public.educations(university text_pattern_ops);

-- いいね一覧取得
create index idx_likes_to_user   on public.likes(to_user_id);
create index idx_likes_from_user on public.likes(from_user_id);

-- マッチング検索（OR クエリ対応）
create index idx_matches_user1 on public.matches(user1_id);
create index idx_matches_user2 on public.matches(user2_id);

-- チャット時系列表示
create index idx_messages_match_created on public.messages(match_id, created_at);
```

### 4-5. 年齢フィルタークエリ

年齢フィルター（S-2）は `birth_date` の範囲変換でクエリを実行する。

```sql
-- 「25〜30歳」でフィルタリングする場合
where birth_date between
  current_date - interval '30 years'
  and current_date - interval '25 years'
```

Supabase JS での実装:

```typescript
if (ageMin) query = query.lte("birth_date", calcBirthDateBound(ageMin))
if (ageMax) query = query.gte("birth_date", calcBirthDateBound(ageMax))

// calcBirthDateBound(age) → current_date - interval '{age} years' 相当の Date 文字列を返す
```

---

## 5. 主要 API / 関数 / コンポーネントインターフェース

### 5-1. 共通型定義（`src/types/index.ts`）

```typescript
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

type Gender = "male" | "female"

type Profile = {
  id: string
  name: string
  birth_date: string        // "YYYY-MM-DD"
  age: number               // profiles_with_age ビュー経由で動的計算
  gender: Gender
  bio: string | null
  photo_url: string | null
  deleted_at: string | null // null = 有効, non-null = 退会済み
  university: string        // educations JOIN 済み
  faculty: string
  graduation_year: number
}

type Match = {
  id: string
  partner: Profile
  created_at: string
  last_message: string | null
}

type Message = {
  id: string
  match_id: string
  sender_id: string | null  // null = 退会済みユーザーの送信メッセージ
  content: string
  created_at: string
}
```

### 5-2. Route Handler

#### `POST /api/likes`

```typescript
// Request body
{ toUserId: string }

// Response 200: いいね送信成功
{ matched: false }
// Response 200: マッチング成立
{ matched: true; matchId: string }
// Response 409: 重複いいね
{ error: "already_liked" }
// Response 403: 認証なし
{ error: "unauthorized" }
```

**処理フロー:**
1. `likes` テーブルに INSERT（UNIQUE 制約で重複防止、409 を返す）
2. 逆方向の like が存在するか確認
3. 存在する場合 `matches` テーブルに INSERT（`user1_id < user2_id` を保証してから）
4. `matched: true` と `matchId` を返す
5. クライアントは `matched: true` を受け取ったら `MatchBanner` を表示

#### `DELETE /api/account`

```typescript
// Response 200
{ ok: true }
```

**処理フロー:**
1. `profiles.deleted_at = now()` で UPDATE（ソフトデリート）
2. `supabase.auth.signOut()` でセッション破棄
3. クライアントが `/login` へリダイレクト

### 5-3. Server Actions

#### 認証（`lib/actions/auth.ts`）

```typescript
registerAction(email: string, password: string): Promise<ActionResult<null>>
// 登録後 /onboarding へリダイレクト

loginAction(email: string, password: string): Promise<ActionResult<null>>
// 成功後 /discover へリダイレクト

logoutAction(): Promise<void>
// /login へリダイレクト
```

#### プロフィール（`lib/actions/profile.ts`）

```typescript
// オンボーディング: プロフィール＋学歴を同時作成（学歴は必須）
createProfileAction(input: {
  name: string
  birth_date: string         // "YYYY-MM-DD"
  gender: Gender
  bio?: string
  photo?: File               // Supabase Storage へアップロード
  university: string
  faculty: string
  graduation_year: number
}): Promise<ActionResult<null>>

// プロフィール・学歴の更新
updateProfileAction(input: {
  name?: string
  birth_date?: string
  bio?: string
  photo?: File
  education?: {
    university?: string
    faculty?: string
    graduation_year?: number
  }
}): Promise<ActionResult<null>>

// 自分のプロフィール取得（education JOIN 済み）
getMyProfileAction(): Promise<ActionResult<Profile>>

// 他者プロフィール取得（退会済みは 404 を返さず deleted_at で判定）
getUserProfileAction(userId: string): Promise<ActionResult<Profile>>

// 異性一覧取得（退会済み除外・フィルター適用）
getDiscoverUsersAction(filters: {
  age_min?: number
  age_max?: number
  university?: string        // ILIKE 検索
  offset?: number
  limit?: number             // デフォルト 20
}): Promise<ActionResult<Profile[]>>
```

#### いいね（`lib/actions/likes.ts`）

```typescript
// 受信いいね一覧（プロフィール JOIN 済み・退会済み除外）
getReceivedLikesAction(): Promise<ActionResult<Profile[]>>

// 自分が送ったいいねの to_user_id 一覧（カード側のいいね済み判定に使用）
getSentLikeTargetIdsAction(): Promise<ActionResult<string[]>>
```

#### マッチング（`lib/actions/matches.ts`）

```typescript
// マッチング一覧（最新メッセージ + 未読件数付き・相手プロフィール JOIN 済み）
// Match.unread_count を含む。→ 詳細: docs/features/unread-badge/design.md §2-3
getMatchesAction(): Promise<ActionResult<Match[]>>

// マッチング詳細（チャット画面初期データ）
getMatchAction(matchId: string): Promise<ActionResult<Match>>
```

#### メッセージ（`lib/actions/messages.ts`）

```typescript
// メッセージ履歴取得（昇順）
getMessagesAction(matchId: string): Promise<ActionResult<Message[]>>

// メッセージ送信
sendMessageAction(matchId: string, content: string): Promise<ActionResult<Message>>

// 既読マーク（未読バッジ機能）→ 詳細: docs/features/unread-badge/design.md §2-1
markAsReadAction(matchId: string): Promise<ActionResult<null>>

// 合計未読件数取得（未読バッジ機能）→ 詳細: docs/features/unread-badge/design.md §2-2
getTotalUnreadCountAction(): Promise<ActionResult<number>>
```

### 5-4. 主要コンポーネント

#### `ProfileCard`

```typescript
type ProfileCardProps = {
  profile: Profile
  isLiked: boolean       // いいね済みか（ハート色制御）
  onLike: (id: string) => void
}
```

#### `LikeButton`

```typescript
type LikeButtonProps = {
  targetUserId: string
  isLiked: boolean
  onMatch: (matchId: string, partner: Profile) => void  // MatchBanner 表示トリガー
}
```

POST `/api/likes` を呼び出し、`matched: true` の場合に `onMatch` を呼び出す。

#### `MatchBanner`

```typescript
type MatchBannerProps = {
  partner: Pick<Profile, "name" | "photo_url">
  matchId: string
  onClose: () => void
}
```

表示はページ最前面（`position: fixed`）。チャットへの誘導リンクを含む。

#### `ChatWindow`

```typescript
type ChatWindowProps = {
  matchId: string
  currentUserId: string
  partner: Pick<Profile, "id" | "name" | "university" | "photo_url"> & { isDeleted: boolean }
  initialMessages: Message[]
}
```

#### `MessageBubble`

```typescript
type MessageBubbleProps = {
  message: Message
  isOwn: boolean         // 自分のメッセージか
  isDeletedSender: boolean  // sender_id === null
}
```

`sender_id === null` の場合「退会済みユーザー」とラベル表示。

### 5-5. カスタムフック

#### `useMessages`

```typescript
// currentUserId 引数を追加（未読バッジ機能）→ 詳細: docs/features/unread-badge/design.md §4-4
function useMessages(matchId: string, currentUserId: string, initialMessages: Message[]): {
  messages: Message[]
  addOptimistic: (content: string, senderId: string) => string
  rollbackOptimistic: (tempId: string) => void
}
```

Supabase Realtime で `messages` テーブルの INSERT イベントを購読し、`messages` state にマージする。相手からのメッセージ受信時に `markAsReadAction(matchId)` を fire-and-forget で呼び出す。コンポーネントアンマウント時に `channel.unsubscribe()` を呼び出す。

#### `useUnreadCount`（未読バッジ機能）→ 詳細: `docs/features/unread-badge/design.md §5`

```typescript
function useUnreadCount(userId: string, initialCount: number): number
```

`messages` テーブルの INSERT と `message_read_receipts` テーブルの変更を Realtime で購読し、合計未読件数をリアルタイムで管理する。`BottomNav` で使用する。

```typescript
const channel = supabase
  .channel(`match:${matchId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages",
    filter: `match_id=eq.${matchId}`,
  }, (payload) => {
    setMessages((prev) => [...prev, payload.new as Message])
  })
  .subscribe()
```

#### `useMatchBanner`

```typescript
function useMatchBanner(): {
  banner: { partner: Pick<Profile, "name" | "photo_url">; matchId: string } | null
  show: (matchId: string, partner: Pick<Profile, "name" | "photo_url">) => void
  dismiss: () => void
}
```

React state のみで管理（永続化なし）。`POST /api/likes` のレスポンスで `matched: true` を受け取ったときに `show()` を呼び出す。

---

## 6. 認証・ルーティング

### ミドルウェア（`middleware.ts`）

```typescript
// 保護対象パス: /discover, /likes, /matches, /chat/:matchId, /profile/:userId, /profile/edit
// 未認証アクセス → /login へリダイレクト
// 認証済みで /login・/register → /discover へリダイレクト
```

### オンボーディング完了チェック（学歴必須の強制）

`(main)/layout.tsx` の Server Component でセッション取得後、`educations` テーブルに行が存在しない場合は `/onboarding` へリダイレクト。これにより **P-2「学歴必須」** をアプリ層で強制する（DB 制約は `user_id UNIQUE` のみで、行の有無はアプリ層が担保）。

---

## 7. エラーハンドリング方針

### レイヤー別の方針

| レイヤー | 方針 |
|---|---|
| Server Action | `try/catch` で Supabase エラーを捕捉し `{ data: null, error: string }` を返す。throw しない |
| Route Handler | `error.code` を見て 400 / 409 / 500 を返す。スタックトレースはサーバーログのみ |
| Client Component | `error` state を保持し、入力欄近くにインラインエラーメッセージを表示 |
| Realtime | 切断時は `channel.subscribe()` のステータスで判定し「再接続中...」バナーを表示。再接続は Supabase SDK に委ねる |

### Supabase エラーコードとマッピング

```typescript
// src/lib/utils.ts
const ERROR_MAP: Record<string, string> = {
  "invalid_credentials":          "メールアドレスまたはパスワードが正しくありません",
  "email_address_already_exists": "このメールアドレスはすでに登録されています",
  "23505":                        "すでに同じデータが存在します",   // UNIQUE 違反
  "23514":                        "入力値が正しくありません",       // CHECK 違反
  "42501":                        "アクセス権限がありません",       // RLS 拒否
  "PGRST116":                     "データが見つかりません",
}

export function supabaseErrorToMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any).code ?? ""
    return ERROR_MAP[code] ?? "予期しないエラーが発生しました。もう一度お試しください"
  }
  return "予期しないエラーが発生しました"
}
```

### フォームバリデーション

- **クライアント側**: HTML5 の `required` / `min` / `max` / `maxLength` 属性で即時フィードバック
- **サーバー側**: Server Action 内で zod によるスキーマ検証（信頼境界はサーバー）
- **二重送信防止**: `useTransition` の `isPending` でボタンを `disabled` にする

---

## 8. テスト方針

### 優先度

MVP 段階では **E2E テストを最優先** とし、ユニットテストはロジックが複雑な関数に限定する。UI コンポーネントのスナップショットテストは行わない。

| 種別 | ツール | 対象 | 優先度 |
|---|---|---|---|
| E2E | Playwright | ユーザーストーリー単位のハッピーパス | 高 |
| 統合 | Vitest + Supabase ローカル | DB 制約・RLS ポリシーの正確性 | 高 |
| ユニット | Vitest | `calcAge()`, `supabaseErrorToMessage()`, フィルタークエリビルダー | 中 |
| 型チェック | `tsc --noEmit` | 全ファイル（CI 必須） | 必須 |

### E2E シナリオ（優先実装順）

1. **新規登録〜オンボーディング完了** — メール登録 → プロフィール＋学歴入力 → `/discover` 到達
2. **いいね〜マッチング成立** — ユーザー A が B にいいね → B が A にいいね → マッチバナー表示 → `/chat/[matchId]` 遷移
3. **チャット送受信** — マッチ済みの A↔B 間でメッセージ送受信・リアルタイム反映を確認
4. **退会フロー** — 退会 → 探索画面から除外 → 相手のチャットに「退会済みユーザー」と表示

### 統合テストで検証する DB 制約

- `birth_date` CHECK（17歳での登録を拒否することを確認）
- `likes` UNIQUE（同一ペアへの二重いいねが 409 になることを確認）
- `matches` CHECK（`user1_id < user2_id` が強制されることを確認）
- 退会時の `messages.sender_id` SET NULL 動作

### CI パイプライン（GitHub Actions）

```
push →
  tsc --noEmit →
  vitest run (unit + integration) →
  playwright test (Supabase ローカル + Next.js dev server)
```

---

## 9. 未解決事項・今後の検討

| ID | 内容 | 対応時期 |
|---|---|---|
| U-1 | `likes` と `matches` の整合性（`likes.is_matched boolean` 追加でマッチ済みいいねを区別） | マッチ済み表示が必要になった時点 |
| U-2 | 通知の永続化（`notifications` テーブル追加） | プッシュ通知実装時 |
| U-3 | メッセージ既読状態 | **実装済み（Phase 12）**: `messages.is_read` ではなく `message_read_receipts(match_id, user_id, last_read_at)` テーブルで管理。→ `docs/features/unread-badge/design.md` |
| U-4 | `matches` の OR クエリ負荷（`match_members` 中間テーブルへの移行） | ユーザー数がボトルネックになった時点 |
| U-5 | `educations.id` の冗長性（`user_id` を PK に変更） | 複数学歴対応が必要になった時点 |
