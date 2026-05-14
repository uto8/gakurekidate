# CLAUDE.md — gakureki-date

学歴情報（大学名・学部・卒業年度）を自己紹介の一部として活用した、恋愛・婚活向け Web マッチングアプリ。
相互いいね制でマッチング成立、マッチした相手とリアルタイムチャットができる。
MVP は完全無料・Web のみ（レスポンシブ対応）。

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 15（App Router / Server Components） |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 |
| UI コンポーネント | shadcn/ui |
| バックエンド / DB | Supabase（PostgreSQL）|
| 認証 | Supabase Auth（JWT + RLS）|
| ストレージ | Supabase Storage |
| リアルタイム | Supabase Realtime（WebSocket）|
| デプロイ | Vercel |
| パッケージ管理 | npm |

---

## よく使うコマンド

```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（http://localhost:3000）
npm run build        # 本番ビルド
npm run lint         # ESLint 実行
npm run typecheck    # tsc --noEmit（型チェックのみ）
npx vitest run       # ユニット・統合テスト
npx playwright test  # E2E テスト
supabase start       # Supabase ローカル起動（テスト用）
supabase gen types typescript --local > src/types/database.ts  # 型再生成
```

---

## ディレクトリ構成のルール

```
gakureki-date/
├── src/
│   ├── app/
│   │   ├── (auth)/          # 未認証ルート（/login, /register）
│   │   ├── (main)/          # 認証済みルート — layout.tsx で education 未登録チェックを行う
│   │   └── api/             # Route Handler（薄いアダプター層のみ。ロジックは actions/ に置く）
│   ├── components/
│   │   ├── ui/              # shadcn/ui ベースの汎用プリミティブのみ
│   │   ├── profile/
│   │   ├── like/
│   │   ├── match/
│   │   ├── chat/
│   │   └── discover/
│   ├── hooks/               # クライアント専用フック（Realtime 購読など）
│   ├── lib/
│   │   ├── supabase/        # client.ts（Browser）/ server.ts（Server Actions）/ database.types.ts
│   │   ├── actions/         # Server Actions（auth / profile / likes / matches / messages）
│   │   └── utils.ts         # cn(), calcAge(), supabaseErrorToMessage() など純粋関数
│   └── types/
│       └── index.ts         # アプリ固有の型エイリアス（Profile, Match, Message など）
├── docs/                    # 設計・仕様ドキュメント（後述の「デザイン参照先」を参照）
├── mockups/                 # HTML + Tailwind CDN の静的モックアップ（参照用。実装ソースではない）
└── supabase/
    └── migrations/          # SQL マイグレーションファイル（時系列管理）
```

**配置ルール:**
- データ取得・書き込みロジックは `lib/actions/` の Server Actions に書く。ページコンポーネントに直接書かない
- Supabase クライアントは用途で使い分ける。ブラウザ側は `client.ts`、Server Actions / Route Handler は `server.ts`
- 汎用 UI（ボタン・入力欄など）は `components/ui/` に置き、機能固有コンポーネントは各サブディレクトリに置く
- `mockups/` は仕様確認用の静的 HTML のみ。実装時は `src/` を編集する

---

## コーディング規約

### 全般
- すべて TypeScript。`any` は原則禁止（Supabase エラーの `code` 取り出し時のみ許容）
- Server Actions の戻り値は必ず `ActionResult<T>` 型にする（throw しない）

```typescript
type ActionResult<T> = { data: T; error: null } | { data: null; error: string }
```

- エラーメッセージは `supabaseErrorToMessage()` を通してユーザー向け日本語にする

### コンポーネント
- 原則 Server Components。`useState` / `useEffect` / Realtime 購読が必要な箇所だけ Client Components にする
- ファイル先頭に `"use client"` が必要かどうか毎回意識する
- Props の型は同ファイル内にインラインで定義する（外部 `types/` への export は不要）

### Supabase
- `createBrowserClient()` にカスタム型ジェネリクスを渡さない（型推論が壊れる）。必要なら `as Profile` で明示キャスト
- RLS を全テーブルに必ず有効化する。`enable row level security` を忘れない
- スキーマ変更後は必ず `supabase gen types` を再実行して `database.types.ts` を更新する

### スタイリング
- **Tailwind ユーティリティクラスのみ使用。インライン `style` 属性は使わない**（mockups/ の HTML は除く）
- 複数クラスの条件分岐は `cn()` ユーティリティ（`clsx` + `tailwind-merge`）を使う
- カラーは `gk.*` トークンを使う（例: `text-gk-gold`、`bg-gk-surface`）。ハードコードした hex は使わない

---

## 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| コンポーネントファイル | PascalCase | `ProfileCard.tsx`, `LikeButton.tsx` |
| hooks ファイル | camelCase、`use` prefix | `useMessages.ts`, `useMatchBanner.ts` |
| Server Actions ファイル | camelCase | `profile.ts`, `likes.ts` |
| Server Action 関数 | camelCase、`Action` suffix | `sendLikeAction()`, `getMatchesAction()` |
| 型エイリアス | PascalCase | `Profile`, `Match`, `ActionResult<T>` |
| DB カラム名 | snake_case（Supabase 標準）| `birth_date`, `photo_url`, `deleted_at` |
| TS 変数 / 関数 | camelCase | `currentUserId`, `calcAge()` |
| 環境変数 | UPPER_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

---

## デザイン参照先

UI を実装するときは以下の順で参照する。

| ドキュメント | 内容 | 参照タイミング |
|---|---|---|
| `docs/design/design-system.md` | **最優先**。カラー・タイポ・スペーシング・ボーダー半径のトークン定義 | 色・サイズ・余白を決めるとき |
| `docs/design/components.md` | コンポーネント一覧。バリエーション・状態・Props 型 | 新規コンポーネントを作るとき |
| `docs/design/screens.md` | 画面ごとの構成要素・状態バリエーション・レスポンシブ方針 | 画面を実装するとき |
| `docs/design/design-principles.md` | デザイン原則・トーン＆ボイス・避けるべきビジュアル | 迷ったとき・レビューのとき |
| `docs/design.md` | アーキテクチャ・データモデル・API 仕様・テスト方針 | バックエンドロジックを実装するとき |
| `docs/requirements.md` | 機能要件・非機能要件・スコープ外 | 何を作るべきか迷ったとき |
| `mockups/` | 静的 HTML モックアップ（10 画面） | ビジュアルの確認・参考 |

---

## UI 実装ガイドライン

### デザインシステムを最優先にする

`docs/design/design-system.md` が**唯一のデザイントークン定義ファイル**。
迷ったら design-system.md に戻る。他のドキュメントや mockups/ との矛盾があれば design-system.md の値を使う。

### Tailwind カラートークン対応表

実装時は必ず `gk.*` トークンを使う。以下は主要なマッピング。

| 役割 | Tailwind クラス | hex |
|---|---|---|
| ページ背景 | `bg-gk-base` | `#0A0A0A` |
| カード背景 | `bg-gk-surface` | `#141414` |
| 入力欄・モーダル | `bg-gk-elevated` | `#1E1E1E` |
| ホバー背景 | `bg-gk-hover` | `#1A1A1A` |
| 本文テキスト | `text-gk-text` | `#F0F0F0` |
| サブテキスト | `text-gk-sub` | `#888888` |
| ミュートテキスト | `text-gk-muted` | `#555555` |
| ボーダー | `border-gk-border` | `#2A2A2A` |
| アクセント（学歴・アクティブ） | `text-gk-gold` / `border-gk-gold` | `#C9A84C` |
| アクセント（明） | `text-gk-gold-light` | `#E8C87A` |
| アクセント（暗） | `text-gk-gold-dark` | `#9A7A2E` |
| 成功 | `text-gk-success` | `#4CAF7A` |
| 警告 | `text-gk-warning` | `#E0A040` |
| エラー | `text-gk-error` | `#E05252` |

Gold グラデーション（Primary ボタン等）は Tailwind の任意値で書く:
```
className="bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
```

### ゴールド（#C9A84C）の使用ルール

**ゴールドは「学歴情報」と「アクティブ状態」の専用シグナルカラー。**

✅ 使ってよい:
- 大学名・学部名のテキスト（`EducationLabel`）
- ロゴ・ワードマーク
- 選択中タブ・フォーカスボーダー・アクティブなトグルボタン
- Primary ボタンの背景グラデーション
- マッチングバナーの装飾ライン

❌ 使ってはいけない:
- 一般的なアイコンやデコレーションへのゴールド流用
- 通知バッジ以外のインジケーター
- テキストの装飾（アンダーラインなど）への流用

### フォント使い分け

| フォント | 用途 | クラス |
|---|---|---|
| Noto Serif JP | ロゴ・ページタイトル・ダイアログ見出し | `font-serif` |
| Noto Sans JP | 本文・ボタン・ラベル・UIテキスト全般 | `font-sans`（デフォルト） |

serif は「品格・知性」の演出に使う。フォームラベルや説明文に serif は使わない。

### レイアウト

- コンテンツ最大幅: `max-w-[480px] mx-auto`
- ページ横パディング: `px-4`（= 16px）
- ボトムナビ高さ: `h-16`（= 64px）
- ヘッダー高さ: `h-14`（= 56px）
- 固定ヘッダーがある画面のメイン上パディング: `pt-[89px]`（ヘッダー 56px + mock-nav 相当）

### コンポーネント実装順の目安

1. プリミティブ（Button / Input / Textarea）
2. レイアウト（PageHeader / BottomNav）
3. フォーム系（FormCard / SectionCard / ProgressBar / ToggleGroup）
4. プロフィール系（Avatar / EducationLabel / ProfileCard）
5. フィードバック（Toast / InlineError / EmptyState / Dialog）
6. 画面固有（ProfileHero / MatchBanner / FilterPanel / MessageBubble）

各コンポーネントのバリエーション・Props 型は `docs/design/components.md` を参照。

---

## やってはいけないこと

### セキュリティ
- RLS を無効のまま本番デプロイしない（`alter table ... enable row level security` を必ず適用）
- `service_role` キーをクライアントサイドに公開しない（`.env.local` の `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用）
- 退会処理で `profiles` レコードを物理削除しない（`deleted_at` のソフトデリートを使う）

### データモデル
- `matches` テーブルに INSERT する際、`user1_id < user2_id` を守らないと UNIQUE 制約が機能しない。必ず小さい UUID を `user1_id` に入れる
- `messages.sender_id` を `ON DELETE CASCADE` に変更しない（退会後のチャット履歴保持のため `SET NULL` が必須）
- `profiles_with_age` ビューを経由せず `birth_date` を直接 `age` として扱わない（年齢は動的計算が必要）

### アーキテクチャ
- Supabase クライアントを Server Action 内で `createBrowserClient()` で作らない（必ず `createServerClient()` を使う）
- データ取得ロジックをページコンポーネント（`page.tsx`）に直接書かない（`lib/actions/` に分離する）
- Realtime 購読を Server Components 内で行わない（Client Components 専用）
- `(main)/layout.tsx` の education チェックを削除しない（学歴必須の強制はここでしか行っていない）

### UI・デザイン
- ライトモード（白背景）のデザインを実装しない（ダークテーマ固定）
- ゴールド以外のアクセントカラーを追加しない（ブランドシグナルが薄れる）
- Tailwind の `style` 属性で色を直接書かない（`gk.*` トークンを使う）
- ゴールドを学歴・アクティブ状態以外のデコレーションに流用しない
- グラデーションをロゴ・Primary ボタン・マッチバナー以外で多用しない（安っぽくなる）
- confetti・派手なアニメーションを実装しない（「静かな喜び」が基本トーン）
- スワイプ UI（Tinder 風）を実装しない（MVPスコープ外かつブランドと不一致）
- モーダルを複数重ねない（操作の複雑さを感じさせる）
- UI コピーに若者言葉・絵文字の多用・過剰な励まし文句を使わない

### Git 操作
- `git push --force`（force push）を main ブランチに対して実行しない
- `git reset --hard` でコミット済みの変更を破棄しない（未コミットの作業が消える）
- `git commit --amend` でリモートに push 済みのコミットを書き換えない
- `git rebase -i` で push 済みコミットを改変しない（履歴の書き換えは共同作業者に影響する）
- `--no-verify` でコミットフックをスキップしない（lint / typecheck を通過させること）
- `.env.local` や `SUPABASE_SERVICE_ROLE_KEY` を含むファイルを commit しない（`.gitignore` に必ず含める）
- `git add .` や `git add -A` で意図しないファイル（`node_modules/`, `.env*`, ビルド成果物）をまとめてステージングしない

### MVP スコープ外（実装しない）
- 学歴の公式認証（学生証・卒業証明書）
- SNS ログイン（Google / Apple）
- プッシュ通知・メール通知
- 課金・プレミアムプラン
- ブロック・通報機能
- スワイプ UI（Tinder 風）
- 同性マッチング
- 管理者ダッシュボード
- ネイティブアプリ（iOS / Android）
