# 未読バッジ機能 — 要件定義書

最終更新: 2026-05-15

---

## 1. 機能概要

マッチング相手から受信した未読メッセージの件数を 2 箇所に表示する機能。

| 表示箇所 | 内容 |
|---|---|
| **BottomNav バッジ** | 全マッチを横断した未読メッセージ合計件数を「マッチング」タブアイコン右上に表示 |
| **チャット一覧バッジ** | `/matches` ページの各チャット行右端に、そのマッチの未読件数を表示 |

**「未読」の定義:** `messages.created_at > message_read_receipts.last_read_at` であり、かつ `sender_id ≠ auth.uid()` かつ `sender_id IS NOT NULL` のメッセージ。自分が送ったメッセージ、および退会済みユーザー（`sender_id IS NULL`）のメッセージは未読カウントに含まない。

---

## 2. ユーザーストーリー

- ユーザーとして、アプリのどの画面を見ていても BottomNav の「マッチング」タブで未読メッセージの合計件数を確認したい。それにより、マッチング一覧を開くまでもなく未読の有無を把握できる
- ユーザーとして、マッチング一覧を開いたとき、どの相手から何件のメッセージが届いているかを各行で一目で確認したい。それにより、誰に返信すべきかを素早く判断できる
- ユーザーとして、チャット画面を開いた時点でバッジが消えることを期待する。それにより、既読済みのチャットが未読として残り続けることがない
- ユーザーとして、チャット画面を開いている最中に相手のメッセージが届いたとき、そのメッセージが自動的に既読になることを期待する。それにより、チャット画面を閉じて再び開き直す手間がない

---

## 3. 機能要件

### UB-1: BottomNav 未読件数バッジ

**シナリオ A: 未読あり**

| | |
|---|---|
| **Given** | ログイン済みユーザーが存在し、自分宛の未読メッセージが 1 件以上ある |
| **When** | BottomNav が表示されているページを閲覧している（全ページ共通）|
| **Then** | BottomNav の「マッチング」タブアイコン右上に未読件数の整数を数字バッジで表示する |

**シナリオ B: 未読なし**

| | |
|---|---|
| **Given** | 未読メッセージが 0 件である |
| **When** | BottomNav が表示されているページを閲覧している |
| **Then** | バッジを表示しない（DOM 上の要素も存在しない）|

**シナリオ C: 99 件超**

| | |
|---|---|
| **Given** | 未読件数が 99 件を超えている |
| **When** | BottomNav が表示されているページを閲覧している |
| **Then** | バッジに「99+」と表示する（100 以上の数字は表示しない）|

**シナリオ D: Realtime 受信**

| | |
|---|---|
| **Given** | ユーザーがチャット画面以外のページ（`/discover`・`/likes`・`/matches`・`/profile/edit` など）を閲覧している |
| **When** | Supabase Realtime が相手からの `messages` INSERT イベントを受信した（`sender_id ≠ auth.uid()`）|
| **Then** | BottomNav バッジの件数をリアルタイムで増加させる。ページ遷移なしに反映する |

---

### UB-2: チャット一覧 per-chat 未読バッジ

**シナリオ A: 未読あり**

| | |
|---|---|
| **Given** | 特定のマッチに対して未読メッセージが 1 件以上ある |
| **When** | マッチング一覧ページ（`/matches`）を表示している |
| **Then** | 該当するチャット行の右端に未読件数の整数をバッジで表示する |

**シナリオ B: 未読なし**

| | |
|---|---|
| **Given** | 特定のマッチに対して未読メッセージが 0 件である |
| **When** | マッチング一覧ページを表示している |
| **Then** | 該当するチャット行にバッジを表示しない |

**シナリオ C: 99 件超**

| | |
|---|---|
| **Given** | 未読件数が 99 件を超えている |
| **When** | マッチング一覧ページを表示している |
| **Then** | 該当するチャット行のバッジに「99+」と表示する |

**シナリオ D: ページ表示タイミング**

| | |
|---|---|
| **Given** | チャット画面を閉じて `/matches` に戻る |
| **When** | `/matches` ページが Server Component として再レンダリングされた |
| **Then** | 直前まで開いていたチャットの未読バッジが 0 件（バッジ非表示）に更新されている |

※ `/matches` 一覧を開いたまま（遷移なしに）新しいメッセージを受信した場合、per-chat バッジのリアルタイム更新は行わない。BottomNav バッジのみリアルタイム更新する（UB-1 シナリオ D）。

---

### UB-3: チャット画面を開いた時点での既読マーク

**シナリオ A: 通常遷移**

| | |
|---|---|
| **Given** | 未読メッセージが存在するマッチのチャット画面に遷移する |
| **When** | `chat/[matchId]` の `ChatView` コンポーネントが初回マウントされた直後（`useEffect` の初回実行）|
| **Then** | `markAsReadAction(matchId)` を呼び出し、`message_read_receipts` テーブルの `(match_id, user_id)` レコードを現在時刻で UPSERT する |

**シナリオ B: バッジへの反映**

| | |
|---|---|
| **Given** | チャット画面で `markAsReadAction` が正常完了した |
| **When** | その後 `/matches` に戻る、または BottomNav バッジを参照する |
| **Then** | 当該マッチに関する件数がバッジから差し引かれ、0 件になっていればバッジが消えている |

**シナリオ C: 既読レコードが存在しない初回訪問**

| | |
|---|---|
| **Given** | `message_read_receipts` に当該 `(match_id, user_id)` のレコードが存在しない |
| **When** | `markAsReadAction(matchId)` を呼び出す |
| **Then** | `INSERT INTO message_read_receipts (match_id, user_id, last_read_at) VALUES (...)` を実行し、新規レコードを作成する |

---

### UB-4: チャット画面を開いている間の自動既読

**シナリオ A: 相手からのメッセージ受信**

| | |
|---|---|
| **Given** | ユーザーが `chat/[matchId]` を開いている |
| **When** | Supabase Realtime が `sender_id ≠ auth.uid()` の `messages` INSERT イベントを受信した |
| **Then** | `markAsReadAction(matchId)` を呼び出して `message_read_receipts.last_read_at` を更新し、当該マッチの未読件数を 0 に維持する |

**シナリオ B: 自分のメッセージ受信（既読処理対象外）**

| | |
|---|---|
| **Given** | ユーザーが `chat/[matchId]` を開いている |
| **When** | Supabase Realtime が `sender_id = auth.uid()` の `messages` INSERT イベントを受信した（自分の送信が Realtime で折り返ってきた）|
| **Then** | `markAsReadAction` を呼び出さない |

---

## 4. 非機能要件

| # | 要件 | 基準値 |
|---|---|---|
| NF-1 | BottomNav バッジの初期表示タイミング | `(main)/layout.tsx` の Server Component で初期件数を取得し、初回 HTML レスポンスに含める。JavaScript ロード後に後付けで表示する設計にしない |
| NF-2 | 既読マーク処理の冪等性 | `markAsReadAction` を同一 `(match_id, user_id)` に対して複数回連続して呼び出しても副作用がない。DB 操作は `INSERT ... ON CONFLICT (match_id, user_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at` で実装する |
| NF-3 | BottomNav バッジのリアルタイム更新遅延 | 相手がメッセージを送信してから、受信側の BottomNav バッジが更新されるまで 2 秒以内（Supabase Realtime の標準レイテンシ範囲内）|
| NF-4 | RLS 完全性 | `message_read_receipts` テーブルに RLS を有効化する。`SELECT`・`INSERT`・`UPDATE` のすべての操作を `user_id = auth.uid()` のレコードのみに制限する。他ユーザーの既読状態は参照できない |
| NF-5 | 未読カウント計算の正確性 | `last_read_at` より後（`>`、同時刻は除外）に作成され、`sender_id ≠ auth.uid()` かつ `sender_id IS NOT NULL` のメッセージのみをカウントする。`last_read_at` が存在しない（初回訪問前）の場合は、マッチ内の全対象メッセージをカウントする |

---

## 5. スコープ外

- **相手への既読通知**: 相手が自分のメッセージを読んだかどうかを表示する機能（本機能は自分の未読状態のみを管理する）
- **メッセージ単位の既読管理**: 本機能は「チャットを開いた時刻」単位（`last_read_at` の単一タイムスタンプ）で管理する。個々のメッセージに `is_read` フラグを付ける実装は行わない
- **スクロール位置による既読管理**: 「メッセージが画面内に表示された瞬間に既読」は実装しない。チャット画面を開いた瞬間にすべて既読とする
- **プッシュ通知・メール通知**: MVP スコープ外（`docs/requirements.md` セクション 5 参照）
- **未読メッセージへのジャンプ**: チャット画面を開くと最新メッセージ位置に自動スクロールする既存動作（`ChatView` の `useEffect` による `scrollIntoView`）を変更しない
- **`/matches` 一覧画面の per-chat バッジのリアルタイム更新**: 一覧画面を開いたまま新着メッセージを受信した場合、per-chat バッジはリアルタイム更新しない。BottomNav バッジのみリアルタイム更新する

---

## 6. 用語

| 用語 | 定義 |
|---|---|
| 未読メッセージ | `messages.created_at > message_read_receipts.last_read_at` かつ `sender_id ≠ auth.uid()` かつ `sender_id IS NOT NULL` を満たすメッセージ |
| 既読マーク | `message_read_receipts` テーブルに `(match_id, user_id, last_read_at = now())` を UPSERT する操作 |
| BottomNav バッジ | BottomNav の「マッチング」タブアイコン右上に表示する未読件数インジケーター。件数が 0 のとき非表示、99 超のとき「99+」と表示する |
| per-chat バッジ | マッチング一覧（`/matches`）の各チャット行右端に表示する、そのマッチに関する未読件数インジケーター |
| `last_read_at` | `message_read_receipts.last_read_at`。ユーザーが特定のチャットを最後に開いた時刻 |
| 初回訪問 | そのマッチに対応する `message_read_receipts` レコードが存在しない状態。この場合の未読件数は、マッチ内の全対象メッセージ数とする |
