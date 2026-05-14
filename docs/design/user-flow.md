# ユーザーフロー図 — 学歴デート

最終更新: 2026-05-14

> `screens.md` の画面定義をもとに、主要シナリオの画面遷移を Mermaid で記述。
> 各シナリオは独立して読める。認証ガードによる自動リダイレクトは末尾の補足を参照。

---

## 凡例

| 記号 | 意味 |
|---|---|
| `([...])` | 開始 / 終了点 |
| `[...]` | 画面（SC-xx / OV-xx）|
| `{...}` | 分岐・判定 |
| `[[...]]` | システム処理（リダイレクト・自動判定）|
| `-->` | ユーザー操作による遷移 |
| `-.->` | システムによる自動遷移 |

---

## 全体遷移マップ

画面間の主要な接続を俯瞰する図。詳細フローは各シナリオを参照。

```mermaid
flowchart LR
    subgraph auth["認証フェーズ"]
        SC01["ランディング\nSC-01"]
        SC02["ログイン\nSC-02"]
        SC03["新規登録\nSC-03"]
        SC04["オンボーディング\nSC-04"]
    end

    subgraph main["メイン（ボトムナビ）"]
        SC05["探索\nSC-05"]
        SC07["いいね受信一覧\nSC-07"]
        SC08["マッチング一覧\nSC-08"]
        SC10["マイプロフィール\nSC-10"]
    end

    subgraph sub["サブ画面 / オーバーレイ"]
        SC06["プロフィール詳細\nSC-06"]
        SC09["チャット\nSC-09"]
        OV01["フィルターパネル\nOV-01"]
        OV02["マッチングバナー\nOV-02"]
    end

    SC01 --> SC02
    SC01 --> SC03
    SC03 --> SC04
    SC02 --> SC04
    SC02 --> SC05
    SC04 --> SC05

    SC05 <--> SC07
    SC05 <--> SC08
    SC05 <--> SC10

    SC05 --> SC06
    SC05 --> OV01
    OV01 -.-> SC05

    SC07 --> SC06
    SC06 --> OV02
    OV02 --> SC09
    SC08 --> SC09
    SC09 -.-> SC08

    SC10 -.-> SC02
```

---

## シナリオ 1: 初回登録〜探索開始

**対象ユーザー:** アプリを初めて利用する新規ユーザー  
**カバー要件:** A-1 / P-1 / P-2 / P-4

```mermaid
flowchart TD
    START(["アプリを開く（未認証）"])

    START --> SC01["SC-01\nランディングページ"]
    SC01 --> |"「新規登録」ボタン"| SC03["SC-03\n新規登録画面"]

    SC03 --> |"フォーム送信"| V1{"バリデーション"}
    V1 --> |"❌ パスワード不一致"| ERR1["エラー表示\n（入力欄直下）"]
    ERR1 --> SC03
    V1 --> |"❌ メールアドレス重複"| ERR2["「このメールアドレスは\nすでに登録されています」"]
    ERR2 --> SC03
    V1 --> |"✅ 成功"| SC04_S1

    subgraph SC04["SC-04 オンボーディング（3ステップ）"]
        SC04_S1["Step 1\n名前 / 生年月日 / 性別"]
        SC04_S2["Step 2\n自己紹介 / プロフィール写真（任意）"]
        SC04_S3["Step 3\n大学名 / 学部名 / 卒業年度"]

        SC04_S1 --> |"「次へ」"| V2{"Step 1\nバリデーション"}
        V2 --> |"❌ 必須項目未入力 / 18歳未満"| SC04_S1
        V2 --> |"✅ 成功"| SC04_S2

        SC04_S2 --> |"「次へ」"| SC04_S3
        SC04_S2 --> |"「スキップ」"| SC04_S3

        SC04_S3 --> |"「完了する」"| V3{"Step 3\nバリデーション"}
        V3 --> |"❌ 必須項目未入力"| SC04_S3
        V3 --> |"✅ 成功"| SAVE[["DB に\nプロフィール・学歴を保存"]]
    end

    SAVE --> SC05["SC-05\n探索画面"]
    SC05 --> DONE(["探索開始 🎉"])
```

---

## シナリオ 2: 既存ユーザーのログイン

**対象ユーザー:** 登録済みのユーザー  
**カバー要件:** A-2 / A-4

```mermaid
flowchart TD
    START(["アプリを開く"])

    START --> CHECK{"認証済み?"}
    CHECK --> |"Yes（Cookie 有効）"| DISC_CHECK{"学歴\n登録済み?"}
    DISC_CHECK --> |"Yes"| SC05["SC-05\n探索画面"]
    DISC_CHECK --> |"No"| SC04["SC-04\nオンボーディング"]

    CHECK --> |"No"| SC01["SC-01\nランディングページ"]
    SC01 --> |"「ログイン」リンク"| SC02["SC-02\nログイン画面"]
    SC01 --> |"「新規登録」ボタン"| SC03["SC-03\n新規登録画面"]
    SC03 --> |"ログインリンク"| SC02

    SC02 --> |"フォーム送信"| AUTH{"認証結果"}
    AUTH --> |"❌ 認証情報が正しくない"| ERR["「メールアドレスまたは\nパスワードが正しくありません」"]
    ERR --> SC02
    AUTH --> |"✅ 成功 + 学歴登録済み"| SC05
    AUTH --> |"✅ 成功 + 学歴未登録"| SC04
    SC04 --> SC05
```

---

## シナリオ 3: 探索・いいね・マッチング成立

**対象ユーザー:** ログイン済みユーザーが相手を探していいねを送る  
**カバー要件:** S-1〜S-4 / L-1 / L-3 / M-1 / M-2

```mermaid
flowchart TD
    SC05["SC-05\n探索画面"]

    SC05 --> FILTER_TAP{"フィルター\nアイコンタップ?"}
    FILTER_TAP --> |"Yes"| OV01["OV-01\nフィルターパネル（ボトムシート）"]
    OV01 --> |"「適用する」"| APPLY[["絞り込み条件を適用\nカード一覧を再取得"]]
    APPLY --> SC05
    OV01 --> |"「リセット」"| RESET[["フィルター条件をクリア"]]
    RESET --> SC05
    OV01 --> |"ドラッグで閉じる"| SC05

    FILTER_TAP --> |"No → カードタップ"| SC06["SC-06\nプロフィール詳細画面"]

    SC06 --> LIKED{"いいね済み?"}
    LIKED --> |"Yes（ボタン無効）"| SC06
    LIKED --> |"No → 「いいね」ボタンタップ"| SEND[["POST /api/likes"]]

    SEND --> MATCH{"マッチング\n成立?"}
    MATCH --> |"No（いいね送信のみ）"| SC06_LIKED["「いいね済み」状態に更新"]
    SC06_LIKED --> SC06

    MATCH --> |"Yes（相互いいね）"| OV02["OV-02\nマッチングバナー"]
    OV02 --> |"「メッセージを送る」"| SC09["SC-09\nチャット画面"]
    OV02 --> |"「あとで」"| SC06

    SC06 --> |"戻るボタン"| SC05
```

---

## シナリオ 4: いいね受信一覧からマッチング成立

**対象ユーザー:** 自分にいいねを送ってきた相手にいいね返しをしてマッチングする  
**カバー要件:** L-2 / M-1 / M-2

```mermaid
flowchart TD
    NAV(["ボトムナビ「いいね」タップ"])
    NAV --> SC07["SC-07\nいいね受信一覧画面"]

    SC07 --> EMPTY{"リストが空?"}
    EMPTY --> |"Yes"| EMPTY_MSG["「まだいいねが届いていません」\n+ 探索画面へ誘導リンク"]
    EMPTY_MSG --> |"リンクタップ"| SC05["SC-05\n探索画面"]

    EMPTY --> |"No → カードタップ"| SC06["SC-06\nプロフィール詳細画面"]

    SC06 --> LIKED{"いいね済み?"}
    LIKED --> |"Yes（ボタン無効）\n※すでにいいね返し済み"| SC06
    LIKED --> |"No → 「いいね」ボタンタップ"| SEND[["POST /api/likes\n（いいね返し）"]]

    SEND --> MATCH{"マッチング\n成立?"}
    MATCH --> |"Yes（必ず成立）"| OV02["OV-02\nマッチングバナー"]
    OV02 --> |"「メッセージを送る」"| SC09["SC-09\nチャット画面"]
    OV02 --> |"「あとで」"| SC06

    SC06 --> |"戻るボタン"| SC07
```

---

## シナリオ 5: マッチング一覧からのチャット

**対象ユーザー:** マッチング済みの相手とメッセージをやり取りする  
**カバー要件:** C-1〜C-4 / M-3

```mermaid
flowchart TD
    NAV(["ボトムナビ「マッチング」タップ"])
    NAV --> SC08["SC-08\nマッチング一覧画面"]

    SC08 --> EMPTY{"リストが空?"}
    EMPTY --> |"Yes"| EMPTY_MSG["「まだマッチングしていません」\n+ 探索画面へ誘導リンク"]
    EMPTY_MSG --> |"リンクタップ"| SC05["SC-05\n探索画面"]

    EMPTY --> |"No → リストアイテムタップ"| SC09["SC-09\nチャット画面"]

    SC09 --> PARTNER{"相手の退会状態"}
    PARTNER --> |"退会済み"| DISABLED["入力欄を無効化\n「退会済みのユーザーです」バナー表示\n過去メッセージは閲覧可"]
    PARTNER --> |"有効"| INPUT["テキスト入力 → 送信ボタン"]

    INPUT --> SEND_MSG[["POST: メッセージ送信"]]
    SEND_MSG --> REALTIME{"Realtime\n接続状態"}
    REALTIME --> |"接続中"| BUBBLE["メッセージバブルをリアルタイム反映"]
    BUBBLE --> INPUT
    REALTIME --> |"切断"| RECONNECT["「再接続中...」バナー表示\nSupabase SDK が自動再接続"]
    RECONNECT --> |"再接続成功"| BUBBLE

    SC09 --> |"ヘッダー戻るボタン"| SC08
```

---

## シナリオ 6: プロフィール編集・退会

**対象ユーザー:** 自分のプロフィールを更新する / 退会する  
**カバー要件:** P-3 / P-4 / AC-1

```mermaid
flowchart TD
    NAV(["ボトムナビ「プロフィール」タップ"])
    NAV --> SC10["SC-10\nマイプロフィール画面"]

    SC10 --> ACTION{"操作"}

    ACTION --> |"フォーム編集 → 「保存する」"| V_EDIT{"バリデーション"}
    V_EDIT --> |"❌ 必須項目未入力"| ERR_EDIT["フィールド直下に\nエラー表示"]
    ERR_EDIT --> SC10
    V_EDIT --> |"✅ 成功"| SAVE_PROF[["DB を更新\n（プロフィール / 学歴）"]]
    SAVE_PROF --> TOAST["保存成功通知を表示"]
    TOAST --> SC10

    ACTION --> |"写真タップ → 画像選択"| UPLOAD[["Supabase Storage\nにアップロード"]]
    UPLOAD --> PREVIEW["写真プレビューを更新"]
    PREVIEW --> SC10

    ACTION --> |"「退会する」リンク"| CONFIRM{"退会確認\nダイアログ"}
    CONFIRM --> |"キャンセル"| SC10
    CONFIRM --> |"退会する"| WITHDRAW[["profiles.deleted_at をセット\nセッション破棄"]]
    WITHDRAW --> |"成功"| SC02["SC-02\nログイン画面"]
    WITHDRAW --> |"エラー"| ERR_WD["エラーメッセージ表示"]
    ERR_WD --> SC10
```

---

## シナリオ 7: エラー時の挙動

### 7-1. 一覧画面（探索 / いいね受信 / マッチング一覧）のロードエラー

```mermaid
flowchart TD
    LOAD[["画面データ取得\n（Server Action）"]]

    LOAD --> RESULT{"取得結果"}
    RESULT --> |"✅ 成功"| LIST["一覧を表示"]
    RESULT --> |"⏳ ローディング中"| SKELETON["スケルトン表示"]
    SKELETON --> RESULT
    RESULT --> |"❌ API エラー"| ERR_LIST["「読み込みに失敗しました。\n再度お試しください」\n+ リトライボタン"]
    ERR_LIST --> |"リトライボタンタップ"| LOAD
    RESULT --> |"✅ 空リスト"| EMPTY["空状態メッセージ\n+ 探索画面への誘導リンク"]
```

### 7-2. いいね送信エラー

```mermaid
flowchart TD
    LIKE_BTN["「いいね」ボタンタップ"]
    LIKE_BTN --> POST[["POST /api/likes"]]

    POST --> LIKE_RESULT{"送信結果"}
    LIKE_RESULT --> |"✅ 成功（マッチングなし）"| LIKED_STATE["「いいね済み」状態に更新"]
    LIKE_RESULT --> |"✅ 成功（マッチング成立）"| OV02["OV-02\nマッチングバナー表示"]
    LIKE_RESULT --> |"❌ 409 重複いいね\n（二重タップ等）"| ALREADY["「いいね済み」状態に更新\n（画面上の不整合を修正）"]
    LIKE_RESULT --> |"❌ ネットワークエラー"| ERR_LIKE["フォーム下部に\nエラーメッセージ表示\nボタンを再度活性化"]
    ERR_LIKE --> LIKE_BTN
```

### 7-3. チャット送信エラー / Realtime 切断

```mermaid
flowchart TD
    INPUT["テキスト入力 → 送信"]
    INPUT --> SEND[["POST: sendMessageAction"]]

    SEND --> SEND_RESULT{"送信結果"}
    SEND_RESULT --> |"✅ 成功"| BUBBLE["バブル表示\n（Realtime または直接追加）"]
    SEND_RESULT --> |"❌ エラー"| ERR_SEND["エラー状態のバブル表示\n+ 「再送」ボタン（未定）"]
    ERR_SEND --> |"再送タップ"| SEND

    REALTIME_CHECK["Realtime 接続監視"]
    REALTIME_CHECK --> |"切断検知"| BANNER["「再接続中...」バナー\nをヘッダー下に表示"]
    BANNER --> RECONNECT{"SDK 自動\n再接続"}
    RECONNECT --> |"成功"| BANNER_HIDE["バナーを非表示"]
    RECONNECT --> |"失敗が続く"| BANNER
```

### 7-4. プロフィール詳細画面のロードエラー

```mermaid
flowchart TD
    NAV(["プロフィール詳細へ遷移"])
    NAV --> FETCH[["getUserProfileAction()を呼び出し"]]

    FETCH --> RESULT{"取得結果"}
    RESULT --> |"⏳ ローディング中"| SKEL["スケルトン表示"]
    SKEL --> RESULT
    RESULT --> |"✅ 有効ユーザー"| DETAIL["プロフィール詳細を表示"]
    RESULT --> |"✅ 退会済みユーザー"| DELETED["「退会済みのユーザーです」表示\nいいねボタンを非表示"]
    RESULT --> |"❌ エラー"| ERR_DETAIL["「プロフィールを読み込めませんでした」\n+ 戻るボタン"]
    ERR_DETAIL --> |"戻るボタン"| PREV(["前の画面へ"])
```

---

## 補足: 認証ガード（自動リダイレクト）

ミドルウェア（`middleware.ts`）と `(main)/layout.tsx` が自動的に実施するリダイレクトの一覧。

```mermaid
flowchart TD
    ACCESS(["URL にアクセス"])

    ACCESS --> MW{"middleware.ts\n認証チェック"}

    MW --> |"未認証 + 保護対象パス\n/discover, /likes, /matches\n/chat/*, /profile/*"| REDIRECT_LOGIN[["→ /login へリダイレクト"]]

    MW --> |"認証済み + /login または /register"| REDIRECT_DISC[["→ /discover へリダイレクト"]]

    MW --> |"認証済み + 保護対象パス以外"| LAYOUT{"(main)/layout.tsx\n学歴チェック"}

    LAYOUT --> |"educations テーブルに\nレコードなし"| REDIRECT_ONB[["→ /onboarding へリダイレクト"]]

    LAYOUT --> |"学歴登録済み"| PAGE["リクエストされた\n画面を表示"]

    REDIRECT_LOGIN --> SC02["SC-02 ログイン画面"]
    REDIRECT_DISC --> SC05["SC-05 探索画面"]
    REDIRECT_ONB --> SC04["SC-04 オンボーディング"]
```

---

## 画面遷移の起点まとめ

| 起点 | 遷移先 | 条件 |
|---|---|---|
| ボトムナビ「探す」 | SC-05 探索 | 常に |
| ボトムナビ「いいね」 | SC-07 いいね受信一覧 | 常に |
| ボトムナビ「マッチング」 | SC-08 マッチング一覧 | 常に |
| ボトムナビ「プロフィール」 | SC-10 マイプロフィール | 常に |
| SC-05 カードタップ | SC-06 プロフィール詳細 | 常に |
| SC-07 カードタップ | SC-06 プロフィール詳細 | 常に |
| SC-06 いいねボタン → マッチング成立 | OV-02 マッチングバナー | 相互いいね時のみ |
| OV-02「メッセージを送る」 | SC-09 チャット | 常に |
| SC-08 リストアイテムタップ | SC-09 チャット | 常に |
| SC-10「退会する」→ 完了 | SC-02 ログイン | 退会処理成功時 |
| 未認証でメイン画面アクセス | SC-02 ログイン | middleware による自動 |
| 認証済みで学歴未登録 | SC-04 オンボーディング | layout.tsx による自動 |
