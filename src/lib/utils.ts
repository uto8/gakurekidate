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
