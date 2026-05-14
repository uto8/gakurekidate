# コンポーネント一覧

モックアップ 10 画面から洗い出した共通コンポーネント。
実装時はこのリストを `components/` ディレクトリの構成の起点として使う。

---

## 目次

- [プリミティブ](#プリミティブ)
  - [Button](#button)
  - [Input](#input)
  - [Textarea](#textarea)
- [レイアウト](#レイアウト)
  - [PageHeader](#pageheader)
  - [BottomNav](#bottomnav)
  - [BottomSheet](#bottomsheet)
- [フォーム](#フォーム)
  - [FormCard](#formcard)
  - [SectionCard](#sectioncard)
  - [ProgressBar](#progressbar)
  - [ToggleGroup](#togglegroup)
- [プロフィール・カード](#プロフィールカード)
  - [Avatar](#avatar)
  - [ProfileCard](#profilecard)
  - [ProfileHero](#profilehero)
  - [EducationLabel](#educationlabel)
  - [MatchListItem](#matchlistitem)
- [チャット](#チャット)
  - [MessageBubble](#messagebubble)
  - [DateSeparator](#dateseparator)
- [バッジ・チップ](#バッジチップ)
  - [Badge](#badge)
  - [FilterChip](#filterchip)
- [フィードバック](#フィードバック)
  - [Toast](#toast)
  - [InlineError](#inlineerror)
  - [EmptyState](#emptystate)
  - [Dialog](#dialog)
- [オーバーレイ](#オーバーレイ)
  - [MatchBanner](#matchbanner)
  - [FilterPanel](#filterpanel)

---

## プリミティブ

### Button

汎用ボタン。4 バリアント × 状態で構成される。

#### バリエーション

| variant | 見た目 | 使用箇所 |
|---|---|---|
| `primary` | gold グラデーション背景、`text-gk-base` | 登録・ログイン・保存・次へ・いいね・送信・適用 |
| `secondary` | `border-gk-border`、`text-gk-sub` | スキップ・リセット・ログアウト・写真を選ぶ |
| `ghost` | ボーダー/背景なし、`text-gk-muted` | 退会する（リンク的扱い）・あとで |
| `danger` | `border-color:#E05252`、`color:#E05252` | 退会確認ダイアログ内の確定ボタン |

#### 状態

| state | スタイル |
|---|---|
| `default` | 通常表示 |
| `hover` | `opacity-90`（primary）/ border・text が `gk-gold` に変化（secondary） |
| `disabled` | `opacity-50`（primary）/ `opacity-60` + `cursor-not-allowed`（secondary） |
| `loading` | 未定（スピナー表示を想定） |

#### サイズ

| size | height | 用途 |
|---|---|---|
| `lg` | h-[52px] | フォーム送信・主要アクション |
| `md` | h-[44px] | 空状態 CTA・写真選択 |
| `sm` | h-[48px] | ログアウトボタン |
| `icon-circle` | w-7〜w-10、rounded-full | 写真編集アイコン・戻るボタン |
| `icon-square` | w-11 h-11、rounded-xl | チャット送信ボタン |

#### Props

```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'lg' | 'md' | 'sm' | 'icon-circle' | 'icon-square'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
  onClick?: () => void
}
```

---

### Input

テキスト系入力フィールド。label・エラーメッセージとセットで使う。

#### バリエーション

| variant | 見た目 | 使用箇所 |
|---|---|---|
| `default` | `bg-gk-elevated`、`border-gk-border` | login・register・onboarding・filter panel |
| `inline` | `bg-transparent`、border なし | my-profile の編集フォーム（SectionCard 内） |

#### 状態

| state | スタイル |
|---|---|
| `default` | `border-gk-border` |
| `focus` | `border-gk-gold` |
| `filled-active` | `border-gk-gold`（onboarding 入力済みフィールド） |
| `error` | `border-color:#E05252` |
| `disabled` | 非表示（今回スコープ外） |

#### Props

```ts
type InputProps = {
  type?: 'text' | 'email' | 'password' | 'date' | 'number'
  variant?: 'default' | 'inline'
  label?: string
  required?: boolean
  placeholder?: string
  value?: string
  error?: string
  hint?: string        // "※ 18歳未満は登録できません" など
  onChange?: (v: string) => void
}
```

---

### Textarea

複数行テキスト入力。チャット入力と自己紹介で挙動が異なる。

#### バリエーション

| variant | 用途 | 特記 |
|---|---|---|
| `bio` | 自己紹介（onboarding・my-profile） | `resize-none`、文字数カウンター付き、固定 rows |
| `chat` | チャット入力 | `min-height:48px`、`max-height:120px`、自動伸長 |

#### 状態

`default` / `focus`（`border-gk-gold`） のみ。

#### Props

```ts
type TextareaProps = {
  variant?: 'bio' | 'chat'
  label?: string
  placeholder?: string
  value?: string
  maxLength?: number    // bio は 200
  showCount?: boolean
  onChange?: (v: string) => void
}
```

---

## レイアウト

### PageHeader

各画面上部の固定ヘッダー。3 種類のレイアウトを持つ。

#### バリエーション

| variant | 構成 | 使用画面 |
|---|---|---|
| `logo` | 左: serif ロゴ（gold）、右: フィルターアイコン | discover |
| `title` | 左: serif タイトル、右: 件数テキスト（任意） | likes・matches・my-profile |
| `back` | 左: 戻る矢印、中: Avatar + 名前/大学名、右: 空 | chat |

#### 状態

`default` のみ（背景は `bg-gk-base`、`border-b border-gk-border`）。

#### Props

```ts
type PageHeaderProps = {
  variant: 'logo' | 'title' | 'back'
  title?: string
  count?: number
  onBack?: () => void
  filterActive?: boolean   // logo variant: フィルターバッジ表示
  onFilterOpen?: () => void
  // back variant
  partnerName?: string
  partnerUniversity?: string
  partnerAvatarUrl?: string | null
}
```

---

### BottomNav

全認証済み画面の下部固定ナビゲーション（4 タブ）。

#### タブ構成

| tab | ラベル | アイコン（active: filled、inactive: outline） |
|---|---|---|
| `discover` | 探す | search |
| `likes` | いいね | heart |
| `matches` | マッチング | chat-bubble |
| `profile` | プロフィール | user |

#### 状態

`active`（`text-gk-gold`、filled icon）/ `inactive`（`text-gk-muted`、outline icon）。

#### Props

```ts
type BottomNavProps = {
  active: 'discover' | 'likes' | 'matches' | 'profile'
}
```

---

### BottomSheet

下からスライドするパネル。フィルターに使用。

#### バリエーション

単一（`bg-gk-elevated`、`rounded-t-2xl`）。上端にドラッグハンドル（`w-10 h-1 bg-gk-border`）。

#### 状態

`open` / `closed`（アニメーションは実装時に定義）。

#### Props

```ts
type BottomSheetProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}
```

---

## フォーム

### FormCard

auth 画面（login・register）と onboarding で使うフォームコンテナ。

- `bg-gk-surface`、`rounded-2xl`、`p-6`、`border border-gk-border`
- 使用画面: login、register、onboarding の各ステップ

#### Props

```ts
type FormCardProps = {
  title?: string    // serif フォントで表示
  children: React.ReactNode
}
```

---

### SectionCard

my-profile の編集フォームで使う、フィールドをグルーピングするカード。

- `bg-gk-surface`、`rounded-xl`、`border border-gk-border`、`overflow-hidden`
- 子要素間を `border-b border-gk-border` で区切る
- 使用画面: my-profile（基本情報・学歴）

#### Props

```ts
type SectionCardProps = {
  label?: string      // セクション見出し（"基本情報" など）
  children: React.ReactNode
}
```

---

### ProgressBar

onboarding のステップ進捗を示すバー。

- `h-1`、`bg-gk-border`、`rounded-full`、`overflow-hidden`
- fill: gold グラデーション（`linear-gradient(90deg, #9A7A2E, #C9A84C, #E8C87A)`、100% 時のみ三色）
- 使用画面: onboarding（33% / 66% / 100%）

#### Props

```ts
type ProgressBarProps = {
  value: number       // 0〜100
  max?: number        // デフォルト 100
}
```

---

### ToggleGroup

排他的な選択肢をボタン群で表示する。

- active: `border-gk-gold`、`text-gk-gold`、`background: rgba(201,168,76,0.08)`
- inactive: `border-gk-border`、`text-gk-sub`
- 使用画面: onboarding step1（性別選択）

#### Props

```ts
type ToggleGroupProps = {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}
```

---

## プロフィール・カード

### Avatar

ユーザーを表す円形要素。写真 or イニシャル（漢字 1 文字）で表示。

#### バリエーション（サイズ）

| size | クラス | 使用箇所 |
|---|---|---|
| `xl` | w-20 h-20 | my-profile・match banner |
| `lg` | w-16 h-16 | match banner（相手側） |
| `md` | w-12 h-12 | matches リスト |
| `sm` | w-9 h-9 | chat ヘッダー |
| `xs` | w-7 h-7 | chat メッセージ横 |

#### 状態

| state | 見た目 |
|---|---|
| `default` | グラデーション背景 + gold ボーダー（自分） or グラデーション背景のみ |
| `no-photo` | `bg-gk-elevated`、`text-gk-muted` |
| `deleted` | `bg-gk-elevated`、`border-gk-border`、muted テキスト |

#### Props

```ts
type AvatarProps = {
  size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
  initial: string           // 漢字 1 文字
  photoUrl?: string | null
  goldBorder?: boolean
  deleted?: boolean
}
```

---

### ProfileCard

discover・likes の 2 カラムグリッドで使うカード。

#### バリエーション

| variant | 見た目 | 使用画面 |
|---|---|---|
| `discover` | 写真 + 名前/年齢 + gold 大学名 + bio 2行 | discover |
| `likes` | discover と同じ構成 + 右上に gold heart バッジ | likes |

#### 状態

| state | スタイル |
|---|---|
| `default` | `bg-gk-surface` |
| `hover` | `bg-gk-hover` |

#### Props

```ts
type ProfileCardProps = {
  variant?: 'discover' | 'likes'
  name: string
  age: number
  university: string
  faculty: string
  bio?: string
  photoUrl?: string | null
  initial: string
  href: string
}
```

---

### ProfileHero

profile-detail 画面の全幅ヒーローエリア。

- `aspect-[4/5]`、グラデーション背景（または実写真）
- 下部グラデーションオーバーレイ（`to top`、`rgba(10,10,10,0.95)` → transparent）
- 名前・年齢を写真上に重ねて表示
- 使用画面: profile-detail

#### Props

```ts
type ProfileHeroProps = {
  name: string
  age: number
  initial: string
  photoUrl?: string | null
  onBack: () => void
}
```

---

### EducationLabel

大学名・学部を gold カラーで表示する再利用パターン。

#### バリエーション

| variant | 表示形式 | 使用箇所 |
|---|---|---|
| `inline` | `◆ 大学名 学部` 1行 | profile card・matches・chat header |
| `block` | 左 gold ボーダー + "Education" 見出し + 大学名・学部（2行） | profile-detail |

#### Props

```ts
type EducationLabelProps = {
  variant?: 'inline' | 'block'
  university: string
  faculty: string
  graduationYear?: number
}
```

---

### MatchListItem

matches 画面のリスト行。

- `flex items-center gap-3 px-4 py-3`、`border-b border-gk-border`、`hover:bg-gk-hover`
- 使用画面: matches

#### 状態

| state | 見た目 |
|---|---|
| `default` | 通常表示 |
| `unread` | 右端に gold 丸バッジ（数字）|
| `no-message` | lastMessage を `text-gk-muted` で「メッセージを送ってみましょう」 |
| `deleted` | `opacity-60`、"退会済み" ステータスバッジ、muted テキスト |

#### Props

```ts
type MatchListItemProps = {
  name: string
  university: string
  faculty: string
  lastMessage?: string
  timestamp?: string
  unreadCount?: number
  avatarInitial: string
  avatarUrl?: string | null
  deleted?: boolean
  href: string
}
```

---

## チャット

### MessageBubble

チャット画面の発言バブル。

#### バリエーション

| variant | 見た目 | 配置 |
|---|---|---|
| `own` | `background:#C9A84C`、`text-gk-base`、`rounded-br-sm` | 右寄せ |
| `partner` | `bg-gk-elevated`、`text-gk-text`、`rounded-bl-sm` | 左寄せ（Avatar 付き） |
| `partner-deleted` | `border-gk-border`、`text-gk-muted` | 左寄せ（"退会済み" ラベル付き） |

#### 状態

`default` のみ（送信中スピナーは実装時に追加）。

#### Props

```ts
type MessageBubbleProps = {
  variant: 'own' | 'partner' | 'partner-deleted'
  content: string
  timestamp: string
  avatarInitial?: string      // partner のみ
  avatarUrl?: string | null   // partner のみ
}
```

---

### DateSeparator

チャット内の日付区切り線。

- 左右に `flex-1 h-px bg-gk-border`、中央に `text-gk-muted text-[12px]`
- 使用画面: chat

#### Props

```ts
type DateSeparatorProps = {
  label: string    // "2026年5月14日" or "今日" など
}
```

---

## バッジ・チップ

### Badge

インライン表示の小サイズラベル。

#### バリエーション

| variant | 見た目 | 使用箇所 |
|---|---|---|
| `unread` | `bg-gk-gold`、`text-gk-base`、w-5 h-5 丸 | matches 未読数 |
| `status` | `bg-gk-elevated`、`border-gk-border`、`text-gk-muted`、px-1.5 py-0.5 角丸 | "退会済み" |
| `required` | `text-gk-gold`、インラインテキスト | フォームラベル内の「必須」 |
| `filter-dot` | w-2 h-2 丸、`bg-gk-gold` | discover ヘッダーのフィルターアイコン上 |

#### Props

```ts
type BadgeProps = {
  variant: 'unread' | 'status' | 'required' | 'filter-dot'
  label?: string    // unread: 数字、status/required: テキスト
}
```

---

### FilterChip

アクティブなフィルター条件を表示・削除するチップ。

- `px-3 py-1`、`rounded-full`、gold 色（border/text/background ともに gold 系）
- 右端に × アイコン（削除ボタン）
- 使用画面: discover（フィルター適用中）

#### 状態

`active` のみ（非表示時はレンダリングしない）。

#### Props

```ts
type FilterChipProps = {
  label: string
  onRemove: () => void
}
```

---

## フィードバック

### Toast

画面上部または下部に一時表示する通知。

#### バリエーション

| variant | 色 | 使用箇所 |
|---|---|---|
| `success` | `bg-success/10`、`border-success/30`、green checkmark | my-profile 保存完了 |
| `warning` | `bg-warning/12`、`border-warning/20`、amber dot（pulse） | chat Realtime 切断バナー |

#### 状態

`visible` / `hidden`（自動で消える想定、duration は実装時に定義）。

#### Props

```ts
type ToastProps = {
  variant: 'success' | 'warning'
  message: string
  visible: boolean
}
```

---

### InlineError

フォームフィールド直下のエラーテキスト + 背景付きエラーボックス。

#### バリエーション

| variant | 見た目 | 使用箇所 |
|---|---|---|
| `field` | フィールド下の `text-[12px] text-error` テキスト | register パスワード確認 |
| `box` | `bg-error/08`、`border-error/30` の角丸ボックス + テキスト | login 認証エラー |

#### Props

```ts
type InlineErrorProps = {
  variant?: 'field' | 'box'
  message: string
}
```

---

### EmptyState

リストデータが 0 件のとき表示するプレースホルダー。

- 中央寄せ、円形アイコンコンテナ + 見出し + 説明文 + secondary ボタン
- 使用画面: likes（空）・matches（空）

#### Props

```ts
type EmptyStateProps = {
  icon: React.ReactNode
  heading: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}
```

---

### Dialog

モーダルダイアログ。現在は退会確認のみ。

- `rounded-2xl`、`background: rgba(10,10,10,0.92)`、`border-gk-border`
- 上部: 警告アイコン（丸）、タイトル、説明文
- 下部: danger ボタン + secondary ボタン
- 使用画面: my-profile（退会確認）

#### 状態

`open` / `closed`。

#### Props

```ts
type DialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant?: 'danger'    // 確定ボタンの色
  onConfirm: () => void
  onCancel: () => void
}
```

---

## オーバーレイ

### MatchBanner

マッチング成立時に表示するオーバーレイカード。

- 上部 3px gold グラデーションライン
- 自分・相手の Avatar（xl）+ ♡ 記号
- マッチ相手名・大学名 + primary ボタン + ghost「あとで」
- 使用画面: profile-detail（OV-02）

#### 状態

`visible` / `hidden`。

#### Props

```ts
type MatchBannerProps = {
  visible: boolean
  myInitial: string
  myPhotoUrl?: string | null
  partnerName: string
  partnerUniversity: string
  partnerFaculty: string
  partnerInitial: string
  partnerPhotoUrl?: string | null
  chatHref: string
  onDismiss: () => void
}
```

---

### FilterPanel

BottomSheet 内に表示するフィルター UI。

- 年齢（min〜max）入力 + 大学名キーワード入力
- 「リセット」secondary ボタン + 「適用する」primary ボタン
- 使用画面: discover（OV-01）

#### Props

```ts
type FilterPanelProps = {
  open: boolean
  defaultAgeMin?: number
  defaultAgeMax?: number
  defaultUniversityKeyword?: string
  onApply: (filters: { ageMin: number; ageMax: number; university: string }) => void
  onReset: () => void
  onClose: () => void
}
```

---

## コンポーネント × 画面 マトリクス

| コンポーネント | landing | login | register | onboarding | discover | profile-detail | likes | matches | chat | my-profile |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Button | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ |
| Input | | ✓ | ✓ | ✓ | | | | | | ✓ |
| Textarea | | | | ✓ | | | | | ✓ | ✓ |
| PageHeader | | | | | ✓ | | ✓ | ✓ | ✓ | ✓ |
| BottomNav | | | | | ✓ | ✓ | ✓ | ✓ | | ✓ |
| BottomSheet | | | | | ✓ | | | | | |
| FormCard | | ✓ | ✓ | ✓ | | | | | | |
| SectionCard | | | | | | | | | | ✓ |
| ProgressBar | | | | ✓ | | | | | | |
| ToggleGroup | | | | ✓ | | | | | | |
| Avatar | | | | | | ✓ | | ✓ | ✓ | ✓ |
| ProfileCard | | | | | ✓ | | ✓ | | | |
| ProfileHero | | | | | | ✓ | | | | |
| EducationLabel | | | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MatchListItem | | | | | | | | ✓ | | |
| MessageBubble | | | | | | | | | ✓ | |
| DateSeparator | | | | | | | | | ✓ | |
| Badge | | | | ✓ | ✓ | | | ✓ | | |
| FilterChip | | | | | ✓ | | | | | |
| Toast | | | | | | | | | ✓ | ✓ |
| InlineError | | ✓ | ✓ | | | | | | | |
| EmptyState | | | | | | | ✓ | ✓ | | |
| Dialog | | | | | | | | | | ✓ |
| MatchBanner | | | | | | ✓ | | | | |
| FilterPanel | | | | | ✓ | | | | | |
