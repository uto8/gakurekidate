import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { formatMessageTime, formatMessageDate } from "../utils";

describe("formatMessageTime", () => {
  it("ISO文字列を HH:mm 形式に変換する", () => {
    // ローカルタイム依存なので new Date() を使って期待値を作る
    const iso = "2026-05-14T09:05:00.000Z";
    const d = new Date(iso);
    const expected = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    expect(formatMessageTime(iso)).toBe(expected);
  });

  it("分が1桁の場合ゼロパディングされる", () => {
    // 任意の時刻を作って確認
    const d = new Date();
    d.setHours(8, 3, 0, 0);
    const result = formatMessageTime(d.toISOString());
    expect(result).toMatch(/^\d{2}:\d{2}$/);
    expect(result.endsWith(":03")).toBe(true);
  });

  it("時が1桁の場合ゼロパディングされる", () => {
    const d = new Date();
    d.setHours(7, 30, 0, 0);
    const result = formatMessageTime(d.toISOString());
    expect(result.startsWith("07")).toBe(true);
  });

  it("返り値が HH:mm パターンに一致する", () => {
    const iso = new Date().toISOString();
    expect(formatMessageTime(iso)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatMessageDate", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("同日のISOは「今日」を返す", () => {
    expect(formatMessageDate("2026-05-14T08:30:00")).toBe("今日");
  });

  it("昨日のISOは「昨日」を返す", () => {
    expect(formatMessageDate("2026-05-13T23:59:00")).toBe("昨日");
  });

  it("2日以上前は「YYYY年M月D日」形式を返す", () => {
    expect(formatMessageDate("2026-05-10T10:00:00")).toBe("2026年5月10日");
  });

  it("月をまたぐ場合も正しく表示する", () => {
    expect(formatMessageDate("2026-04-01T10:00:00")).toBe("2026年4月1日");
  });

  it("年をまたぐ場合も正しく表示する", () => {
    expect(formatMessageDate("2025-12-31T10:00:00")).toBe("2025年12月31日");
  });
});
