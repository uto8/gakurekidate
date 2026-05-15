import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 年齢 → birth_date の上限/下限を "YYYY-MM-DD" 文字列で返す。
 * Supabase の birth_date range クエリで使用する。
 *
 * 例: calcBirthDateBound(25) → 「今日から25年前」の日付文字列
 *   age_min=25 → birth_date <= calcBirthDateBound(25)  （25歳以上）
 *   age_max=30 → birth_date >= calcBirthDateBound(30)  （30歳以下）
 */
export function calcBirthDateBound(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 生年月日文字列（YYYY-MM-DD）が 18 歳以上かを判定する。
 * 文字列比較を使うため timezone の影響を受けない。
 */
export function isAdult(birthDateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear() - 18;
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return birthDateStr <= `${y}-${m}-${d}`;
}

const ERROR_MAP: Record<string, string> = {
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  email_address_already_exists:
    "このメールアドレスはすでに登録されています",
  "23505": "すでに同じデータが存在します", // UNIQUE 違反
  "23514": "入力値が正しくありません", // CHECK 違反
  "42501": "アクセス権限がありません", // RLS 拒否
  PGRST116: "データが見つかりません",
};

/**
 * 年齢範囲の入力値が有効かを判定する純粋関数。
 * 両方 undefined の場合はフィルターなし（有効）。
 * min <= max かつ 18〜99 歳の範囲内であること。
 */
export function validateAgeRange(
  ageMin?: number,
  ageMax?: number
): { valid: boolean; error?: string } {
  if (ageMin === undefined && ageMax === undefined) {
    return { valid: true };
  }
  if (ageMin !== undefined && (ageMin < 18 || ageMin > 99)) {
    return { valid: false, error: "年齢は18〜99歳で入力してください" };
  }
  if (ageMax !== undefined && (ageMax < 18 || ageMax > 99)) {
    return { valid: false, error: "年齢は18〜99歳で入力してください" };
  }
  if (ageMin !== undefined && ageMax !== undefined && ageMin > ageMax) {
    return { valid: false, error: "年齢下限は上限以下にしてください" };
  }
  return { valid: true };
}

/** ISO 文字列 → "HH:mm" 形式（チャットバブルのタイムスタンプ用） */
export function formatMessageTime(isoString: string): string {
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** ISO 文字列 → "今日" / "昨日" / "YYYY年MM月DD日"（DateSeparator 用） */
export function formatMessageDate(isoString: string): string {
  const d = new Date(isoString);
  const today = new Date();
  const toDateStr = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const msgDateStr = toDateStr(d);
  const todayStr = toDateStr(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  if (msgDateStr === todayStr) return "今日";
  if (msgDateStr === yesterdayStr) return "昨日";

  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * messages 配列と既読タイムスタンプ Map から match ごとの未読件数 Map を返す。
 * - sender_id が null（退会済みユーザー）は対象外
 * - sender_id === currentUserId（自分の送信）は対象外
 * - created_at > last_read_at のメッセージのみカウント（同時刻は既読扱い）
 * - last_read_at が Map にない（初回訪問）場合は全対象メッセージをカウント
 */
export function buildUnreadCountMap(
  messages: Array<{
    match_id: string;
    sender_id: string | null;
    created_at: string;
  }>,
  lastReadMap: Map<string, string>,
  currentUserId: string
): Map<string, number> {
  const countMap = new Map<string, number>();
  for (const msg of messages) {
    if (!msg.sender_id || msg.sender_id === currentUserId) continue;
    const lastRead = lastReadMap.get(msg.match_id);
    if (!lastRead || msg.created_at > lastRead) {
      countMap.set(msg.match_id, (countMap.get(msg.match_id) ?? 0) + 1);
    }
  }
  return countMap;
}

export function supabaseErrorToMessage(error: unknown): string {
  if (error instanceof Error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code: string = (error as any).code ?? "";
    return (
      ERROR_MAP[code] ??
      "予期しないエラーが発生しました。もう一度お試しください"
    );
  }
  return "予期しないエラーが発生しました";
}
