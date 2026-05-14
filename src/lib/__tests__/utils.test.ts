import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { calcBirthDateBound, isAdult, supabaseErrorToMessage, validateAgeRange } from "../utils";

// --- calcBirthDateBound ---

describe("calcBirthDateBound", () => {
  // 固定日付でテスト（2026-05-14）
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("25歳の境界値は 2001-05-14 を返す", () => {
    expect(calcBirthDateBound(25)).toBe("2001-05-14");
  });

  it("30歳の境界値は 1996-05-14 を返す", () => {
    expect(calcBirthDateBound(30)).toBe("1996-05-14");
  });

  it("0歳の境界値は今日（2026-05-14）を返す", () => {
    expect(calcBirthDateBound(0)).toBe("2026-05-14");
  });

  it("18歳の境界値は 2008-05-14 を返す", () => {
    expect(calcBirthDateBound(18)).toBe("2008-05-14");
  });

  it("うるう年をまたぐケース: 2024-02-29 基準で 2歳 → 2022-02-28", () => {
    vi.setSystemTime(new Date("2026-02-28"));
    // 2026-02-28 から2年前 = 2024-02-28（2024はうるう年だが2/29は存在するのでそのまま）
    expect(calcBirthDateBound(2)).toBe("2024-02-28");
  });

  it("戻り値が YYYY-MM-DD 形式である", () => {
    vi.setSystemTime(new Date("2026-05-14"));
    const result = calcBirthDateBound(20);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// --- isAdult ---

describe("isAdult", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("ちょうど18年前（2008-05-14）は true", () => {
    expect(isAdult("2008-05-14")).toBe(true);
  });

  it("18年前の翌日（2008-05-15）は false", () => {
    expect(isAdult("2008-05-15")).toBe(false);
  });

  it("25歳（2001-01-01）は true", () => {
    expect(isAdult("2001-01-01")).toBe(true);
  });

  it("17歳（2009-05-14）は false", () => {
    expect(isAdult("2009-05-14")).toBe(false);
  });

  it("17歳の最終日（2008-05-13 の翌日 = 2008-05-14 は18歳）", () => {
    expect(isAdult("2008-05-13")).toBe(true);
  });
});

// --- supabaseErrorToMessage ---

describe("supabaseErrorToMessage", () => {
  it("invalid_credentials コードで日本語メッセージを返す", () => {
    const err = Object.assign(new Error("auth error"), {
      code: "invalid_credentials",
    });
    expect(supabaseErrorToMessage(err)).toBe(
      "メールアドレスまたはパスワードが正しくありません"
    );
  });

  it("email_address_already_exists コードで日本語メッセージを返す", () => {
    const err = Object.assign(new Error(), {
      code: "email_address_already_exists",
    });
    expect(supabaseErrorToMessage(err)).toBe(
      "このメールアドレスはすでに登録されています"
    );
  });

  it("23505（UNIQUE 違反）で日本語メッセージを返す", () => {
    const err = Object.assign(new Error(), { code: "23505" });
    expect(supabaseErrorToMessage(err)).toBe("すでに同じデータが存在します");
  });

  it("23514（CHECK 違反）で日本語メッセージを返す", () => {
    const err = Object.assign(new Error(), { code: "23514" });
    expect(supabaseErrorToMessage(err)).toBe("入力値が正しくありません");
  });

  it("42501（RLS 拒否）で日本語メッセージを返す", () => {
    const err = Object.assign(new Error(), { code: "42501" });
    expect(supabaseErrorToMessage(err)).toBe("アクセス権限がありません");
  });

  it("PGRST116 で日本語メッセージを返す", () => {
    const err = Object.assign(new Error(), { code: "PGRST116" });
    expect(supabaseErrorToMessage(err)).toBe("データが見つかりません");
  });

  it("未知のコードはデフォルトメッセージを返す", () => {
    const err = Object.assign(new Error(), { code: "UNKNOWN_CODE" });
    expect(supabaseErrorToMessage(err)).toBe(
      "予期しないエラーが発生しました。もう一度お試しください"
    );
  });

  it("code プロパティがない Error はデフォルトメッセージを返す", () => {
    expect(supabaseErrorToMessage(new Error("something"))).toBe(
      "予期しないエラーが発生しました。もう一度お試しください"
    );
  });

  it("Error 以外（文字列）はデフォルトメッセージを返す", () => {
    expect(supabaseErrorToMessage("raw error string")).toBe(
      "予期しないエラーが発生しました"
    );
  });

  it("null はデフォルトメッセージを返す", () => {
    expect(supabaseErrorToMessage(null)).toBe(
      "予期しないエラーが発生しました"
    );
  });
});

// --- validateAgeRange ---

describe("validateAgeRange", () => {
  it("両方 undefined の場合は valid", () => {
    expect(validateAgeRange()).toEqual({ valid: true });
  });

  it("min のみ指定（18歳）は valid", () => {
    expect(validateAgeRange(18, undefined)).toEqual({ valid: true });
  });

  it("max のみ指定（99歳）は valid", () => {
    expect(validateAgeRange(undefined, 99)).toEqual({ valid: true });
  });

  it("min <= max の正常ケース", () => {
    expect(validateAgeRange(25, 32)).toEqual({ valid: true });
  });

  it("min === max は valid", () => {
    expect(validateAgeRange(30, 30)).toEqual({ valid: true });
  });

  it("min > max はエラー", () => {
    const result = validateAgeRange(35, 25);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("下限は上限以下");
  });

  it("min が 17（18歳未満）はエラー", () => {
    const result = validateAgeRange(17, 30);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("18〜99");
  });

  it("max が 100（99歳超）はエラー", () => {
    const result = validateAgeRange(25, 100);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("18〜99");
  });

  it("min が 0 はエラー", () => {
    expect(validateAgeRange(0, 30).valid).toBe(false);
  });
});
