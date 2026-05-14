# 実装タスク一覧 — gakureki-date MVP

最終更新: 2026-05-14（Phase 1 完了）

凡例: `[ ]` 未着手 / `[x]` 完了

---

## MVP タスク

### Phase 1: セットアップ

#### 1-1. Next.js プロジェクト初期化
- [x] `create-next-app` で App Router / TypeScript / Tailwind を選択して雛形を生成する
- **完了条件**: `npm run dev` でトップページが表示される。`npm run build` がエラーなく通る

#### 1-2. Supabase プロジェクト作成・環境変数設定
- [x] Supabase ダッシュボードでプロジェクトを作成し、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を `.env.local` に記載する
- **完了条件**: `.env.local` が存在し、`.gitignore` に含まれている

#### 1-3. Supabase ローカル開発環境セットアップ
- [x] `supabase init` を実行し、`supabase start` でローカル DB が起動することを確認する
- **完了条件**: `supabase status` でローカルの URL と anon key が表示される

#### 1-4. shadcn/ui 導入
- [x] `npx shadcn@latest init` を実行し、Button / Input / Card / Avatar コンポーネントを追加する
- **完了条件**: `src/components/ui/` に各ファイルが生成されている

#### 1-5. lint / typecheck コマンド設定
- [x] `package.json` の `scripts` に `"typecheck": "tsc --noEmit"` を追加し、ESLint 設定を確認する
- **完了条件**: `npm run typecheck` と `npm run lint` がエラーなく通る

---

### Phase 2: DB 基盤

#### 2-1. profiles テーブル作成・RLS 設定
- [ ] マイグレーションファイルを作成し、`profiles` テーブル（`id`, `name`, `birth_date`, `gender`, `bio`, `photo_url`, `deleted_at`, `created_at`, `updated_at`）と RLS ポリシー 3 件（select / insert / update）を適用する
- **完了条件**: `supabase db push` が通る。退会済みユーザーが他者から見えないことを Supabase Studio で確認できる

#### 2-2. educations テーブル作成・RLS 設定
- [ ] `educations` テーブル（`id`, `user_id UNIQUE FK`, `university`, `faculty`, `graduation_year`, タイムスタンプ）と RLS ポリシー（select: 全員可 / all: 本人のみ）を作成する
- **完了条件**: `user_id` に UNIQUE 制約が効いており、同一ユーザーの二重挿入が拒否される

#### 2-3. likes テーブル作成・RLS 設定
- [ ] `likes` テーブル（UNIQUE(from, to) / CHECK(from <> to)）と RLS ポリシー（select: 関与者のみ / insert: 本人のみ）を作成する
- **完了条件**: 自己いいねと重複いいねがそれぞれ DB 制約で拒否される

#### 2-4. matches テーブル作成・RLS 設定
- [ ] `matches` テーブル（CHECK(user1_id < user2_id) / UNIQUE(user1, user2)）と RLS ポリシー（select: 当事者のみ）を作成する
- **完了条件**: `user1_id >= user2_id` での INSERT が CHECK 違反になる

#### 2-5. messages テーブル作成・RLS 設定
- [ ] `messages` テーブル（`sender_id` は `ON DELETE SET NULL` / CHECK 1〜1000 文字）と RLS ポリシー（マッチ参加者のみ読み書き可）を作成する
- **完了条件**: 第三者がマッチ外のメッセージを SELECT できないことを Supabase Studio で確認できる

#### 2-6. profiles_with_age ビュー作成
- [ ] `profiles_with_age` ビューを作成する（`profiles` LEFT JOIN `educations`、`age` を `date_part('year', age(birth_date))` で動的計算）
- **完了条件**: ビューに対して SELECT するだけで `age`, `university`, `faculty`, `graduation_year` が返る

#### 2-7. インデックス作成
- [ ] `profiles(gender, birth_date) WHERE deleted_at IS NULL`, `educations(university text_pattern_ops)`, `likes(to_user_id)`, `likes(from_user_id)`, `matches(user1_id)`, `matches(user2_id)`, `messages(match_id, created_at)` の 7 本を追加する
- **完了条件**: `\d profiles` 等でインデックスが確認できる

#### 2-8. Supabase 型生成・Supabase クライアント作成
- [ ] `supabase gen types typescript --local > src/types/database.ts` を実行し、`src/lib/supabase/client.ts`（`createBrowserClient`）と `src/lib/supabase/server.ts`（`createServerClient` + cookies）を作成する
- **完了条件**: `database.ts` が生成されており、`client.ts` / `server.ts` がインポートエラーなしにコンパイルできる

---

### Phase 3: アプリ基盤

#### 3-1. 共通型定義（`src/types/index.ts`）
- [ ] `ActionResult<T>`, `Gender`, `Profile`, `Match`, `Message` を定義する
- **完了条件**: `tsc --noEmit` がエラーなく通る

#### 3-2. utils.ts 作成
- [ ] `cn()`（clsx + tailwind-merge）, `calcBirthDateBound(age: number): string`（年齢→ birth_date 境界値変換）, `supabaseErrorToMessage(error: unknown): string` を実装する
- **完了条件**: Vitest で `calcBirthDateBound` と `supabaseErrorToMessage` のユニットテストが通る

#### 3-3. middleware.ts 実装
- [ ] 保護対象パス（`/discover`, `/likes`, `/matches`, `/chat/:matchId`, `/profile/:userId`, `/profile/edit`）への未認証アクセスを `/login` へリダイレクトする。認証済みで `/login` / `/register` へのアクセスは `/discover` へリダイレクトする
- **完了条件**: ログアウト状態で `/discover` に直アクセスすると `/login` へ飛ぶ

---

### Phase 4: 認証

#### 4-1. 登録ページ（`/register`）+ Server Action
- [ ] メールアドレス・パスワード入力フォームを作成し、`registerAction` を実装する（Supabase Auth の `signUp` を呼び出し、成功後 `/onboarding` へリダイレクト）
- **完了条件**: 登録後に Supabase Auth のユーザー一覧にメールが表示される。メール重複時にエラーメッセージが表示される

#### 4-2. ログインページ（`/login`）+ Server Action
- [ ] メールアドレス・パスワード入力フォームを作成し、`loginAction` を実装する（成功後 `/discover` へリダイレクト。education 未登録なら `/onboarding` へ）
- **完了条件**: 正しい認証情報でログインして `/discover` に遷移できる。誤認証時にエラーメッセージが表示される

#### 4-3. ログアウト処理
- [ ] ナビゲーションにログアウトボタンを設置し、`logoutAction` を実装する（`signOut` → `/login` リダイレクト）
- **完了条件**: ログアウト後に保護ページへアクセスすると `/login` へリダイレクトされる

---

### Phase 5: オンボーディング

#### 5-1. `(main)/layout.tsx`（education チェック）
- [ ] Server Component で現在ユーザーの `educations` 行の有無を確認し、未登録なら `/onboarding` へリダイレクトする
- **完了条件**: education 未登録のユーザーが `/discover` にアクセスすると `/onboarding` へ飛ぶ。education 登録済みのユーザーは `/onboarding` へリダイレクトされない

#### 5-2. オンボーディングページ（`/onboarding`）+ Server Action
- [ ] 名前・生年月日・性別・自己紹介（任意）・大学名・学部・卒業年度の入力フォームを作成し、`createProfileAction` を実装する（`profiles` + `educations` をトランザクション的に INSERT。成功後 `/discover` へ）
- **完了条件**: 入力後に `profiles` と `educations` の両レコードが作成される。17歳以下の `birth_date` はエラーになる

---

### Phase 6: プロフィール

#### 6-1. 他者プロフィール詳細ページ（`/profile/[userId]`）
- [ ] `getUserProfileAction` を実装し、名前・年齢・性別・自己紹介・学歴・写真を表示する。退会済みユーザーは「退会済みユーザー」と表示する
- **完了条件**: `/profile/[有効なuserID]` で全フィールドが表示される。退会済みユーザーの ID へのアクセスで「退会済みユーザー」が表示される

#### 6-2. プロフィール編集ページ（`/profile/edit`）+ Server Action
- [ ] 各フィールドを編集できるフォームを作成し、`updateProfileAction` を実装する（`profiles` と `educations` を個別に UPDATE）
- **完了条件**: 変更を保存後にプロフィール詳細ページに反映されている

#### 6-3. プロフィール写真アップロード
- [ ] ファイル選択 UI を作成し、Supabase Storage の `avatars` バケットへアップロードする。取得した URL を `profiles.photo_url` に保存する
- **完了条件**: 写真を選択・保存すると `photo_url` が更新され、プロフィールに画像が表示される。別ユーザーによる上書きが Storage RLS で拒否される

---

### Phase 7: ユーザー探索

#### 7-1. 探索ページ基本一覧（`/discover`）
- [ ] `getDiscoverUsersAction`（異性・退会済み除外・ページネーション付き）を実装し、`ProfileCard` と `UserGrid` を使って一覧表示する
- **完了条件**: 自分と異なる性別・退会済み以外のユーザーのみが表示される。自分自身は表示されない

#### 7-2. FilterPanel（年齢・大学名フィルター）
- [ ] 年齢下限・上限の数値入力と大学名キーワード入力を持つ `FilterPanel` を実装する。フィルター変更で `getDiscoverUsersAction` を再実行する
- **完了条件**: 年齢フィルター適用時に範囲外のユーザーが除外される。大学名キーワードで部分一致絞り込みができる

---

### Phase 8: いいね

#### 8-1. Route Handler: `POST /api/likes`
- [ ] いいね送信・重複チェック（409）・相互いいね判定・`matches` INSERT をまとめて実装する。`user1_id < user2_id` を保証してから INSERT する
- **完了条件**: 初回いいねで `{ matched: false }` が返る。相互いいね時に `{ matched: true, matchId }` が返り `matches` レコードが作成される。重複いいねで 409 が返る

#### 8-2. LikeButton コンポーネント
- [ ] `POST /api/likes` を呼び出す `LikeButton` を実装する。`isPending` 中はボタンを disabled にする。`matched: true` のレスポンス時に `onMatch` コールバックを呼び出す
- **完了条件**: いいね送信中はボタンが無効化される。マッチング成立時に `onMatch` が呼ばれる

#### 8-3. MatchBanner + useMatchBanner
- [ ] `useMatchBanner` フック（React state のみ）と `MatchBanner` コンポーネント（固定表示・チャットへのリンク）を実装する
- **完了条件**: マッチング成立直後にバナーが表示され、「メッセージを送る」でチャット画面へ遷移できる。「閉じる」でバナーが消える

#### 8-4. 受信いいね一覧ページ（`/likes`）
- [ ] `getReceivedLikesAction` を実装し、自分にいいねを送ってきたユーザーを `ProfileCard` で一覧表示する
- **完了条件**: 受信いいね一覧に送信者のプロフィール・学歴が表示される。退会済みユーザーからのいいねは除外される

---

### Phase 9: マッチング

#### 9-1. マッチング一覧ページ（`/matches`）
- [ ] `getMatchesAction` を実装し、マッチした相手の一覧（名前・学歴・最終メッセージ）を表示する。各行をタップするとチャット画面へ遷移する
- **完了条件**: マッチング成立済みの相手のみが一覧に表示される。相手の名前クリックでチャット画面へ遷移できる

---

### Phase 10: チャット

#### 10-1. チャット画面初期表示（`/chat/[matchId]`）
- [ ] `getMatchAction` と `getMessagesAction` を実装し、ヘッダー（相手の名前・学歴）とメッセージ履歴を表示する
- **完了条件**: チャット画面を開くとメッセージ履歴が時系列で表示される。`ChatHeader` に相手の名前と大学名が表示される

#### 10-2. useMessages フック（Realtime 購読）
- [ ] Supabase Realtime で `messages` テーブルの INSERT を購読し、新着メッセージを state にマージする `useMessages` フックを実装する。アンマウント時に `channel.unsubscribe()` を呼ぶ
- **完了条件**: 別タブで送信したメッセージがリロードなしで即座に表示される

#### 10-3. メッセージ送信フォーム
- [ ] テキスト入力 + 送信ボタンの `MessageInput` を実装し、`sendMessageAction` を呼び出す。送信後に入力欄をクリアし、最下部にスクロールする
- **完了条件**: テキストを入力して送信すると即座に吹き出しとして表示される。1000 文字超の送信はエラーになる

#### 10-4. MessageBubble（退会済みユーザー対応）
- [ ] `sender_id === null` の場合に「退会済みユーザー」とラベル表示する `MessageBubble` を実装する
- **完了条件**: `sender_id` が null のメッセージが「退会済みユーザー」として表示される

#### 10-5. ChatHeader（退会済みユーザー対応）
- [ ] `partner.isDeleted === true` の場合に相手名を「退会済みユーザー」と表示する `ChatHeader` を実装する
- **完了条件**: 退会済みの相手とのチャット画面でヘッダーが「退会済みユーザー」と表示される

---

### Phase 11: アカウント管理

#### 11-1. Route Handler: `DELETE /api/account`（退会）
- [ ] `profiles.deleted_at = now()` で UPDATE したあと `signOut()` を呼び出す `DELETE /api/account` を実装する
- **完了条件**: 退会後にセッションが無効化されて `/login` へリダイレクトされる。退会したユーザーが探索一覧に表示されない。退会ユーザーのメッセージが「退会済みユーザー」と表示される

#### 11-2. 退会ボタン UI
- [ ] プロフィール編集ページに退会ボタンを設置し、確認ダイアログ後に `DELETE /api/account` を呼び出す
- **完了条件**: 確認ダイアログなしに退会できない。退会実行後に `/login` へリダイレクトされる

---

### Phase 12: 仕上げ

#### 12-1. レスポンシブ対応確認・調整
- [ ] 375px（iPhone SE 相当）と 1280px（デスクトップ）の両幅でスクリーンショットを取得し、主要ページのレイアウト崩れを修正する
- **完了条件**: `playwright-cli screenshot` で探索・チャット・プロフィール各ページのモバイル表示が崩れていない

#### 12-2. エラーハンドリング統一
- [ ] 全 Server Actions と Route Handlers で `supabaseErrorToMessage` を使っているか確認し、未対応箇所を修正する。フォームのバリデーションエラーが入力欄近くに表示されるか確認する
- **完了条件**: `tsc --noEmit` が通る。各フォームで不正入力時に日本語のエラーメッセージが表示される

#### 12-3. Vercel デプロイ・本番環境変数設定
- [ ] Vercel にプロジェクトを接続し、本番 Supabase の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してデプロイする
- **完了条件**: Vercel の本番 URL でログイン〜探索〜いいね〜チャットの一連フローが動作する

---

## 後回しタスク（MVP 後）

### テスト整備

#### T-1. Vitest ユニットテスト
- [ ] `calcBirthDateBound`, `supabaseErrorToMessage`, フィルタークエリビルダーのテストを実装する
- **完了条件**: `vitest run` で全テストが通る

#### T-2. Supabase ローカルを使った統合テスト
- [ ] DB 制約（18歳チェック / likes UNIQUE / matches CHECK / messages SET NULL）をテストする
- **完了条件**: 各制約違反のケースが Vitest + Supabase ローカルで検出される

#### T-3. Playwright E2E テスト
- [ ] 以下の 4 シナリオを自動化する: (1)新規登録〜オンボーディング, (2)いいね〜マッチング成立, (3)チャット送受信, (4)退会フロー
- **完了条件**: `playwright test` でシナリオが全てグリーンになる

#### T-4. GitHub Actions CI パイプライン
- [ ] `push` をトリガーに `tsc --noEmit` → `vitest run` → `playwright test` を実行するワークフローを設定する
- **完了条件**: PR を作成すると CI が自動実行され、結果がチェックとして表示される

### 品質・運用

#### Q-1. Sentry エラーモニタリング導入
- [ ] Sentry SDK を導入し、Server Actions と Route Handlers のエラーを Sentry に送信する
- **完了条件**: 意図的なエラーが Sentry ダッシュボードに表示される

#### Q-2. OG 画像・メタデータ設定
- [ ] `app/layout.tsx` に `metadata` を設定し、SNS シェア時に適切な OG 画像とタイトルが表示されるようにする
- **完了条件**: Twitter Card Validator でサムネイルが表示される

#### Q-3. `profiles.last_active_at` 追加（アクティブ順ソート）
- [ ] `profiles` に `last_active_at timestamptz` を追加し、ログイン時に更新する。探索一覧をアクティブ順にソートする
- **完了条件**: 最近ログインしたユーザーが探索一覧の上位に表示される

#### Q-4. マッチング通知の永続化（`notifications` テーブル）
- [ ] `notifications` テーブルを追加し、マッチング成立時にレコードを挿入する。ナビゲーションに未読バッジを表示する
- **完了条件**: ログイン後に未読通知バッジが表示され、確認後に消える
