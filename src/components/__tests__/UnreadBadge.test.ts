import { describe, it, expect } from "vitest";

// MatchListItem / BottomNav 共通のバッジ表示ロジックを抽出してテストする。
// 実際の描画条件: badge > 0 のときのみ <span> を表示し、99 超は "99+" とする。

function formatBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

describe("未読バッジ表示ロジック", () => {
  it("unreadCount=3 のとき '3' を表示する", () => {
    expect(formatBadge(3)).toBe("3");
  });

  it("unreadCount=0 のときバッジを表示しない", () => {
    expect(formatBadge(0)).toBeNull();
  });

  it("unreadCount を省略（0 扱い）のときバッジを表示しない", () => {
    // 呼び出し側: badge = unreadCount ?? 0
    const unreadCount: number | undefined = undefined;
    expect(formatBadge(unreadCount ?? 0)).toBeNull();
  });

  it("unreadCount=99 のとき '99' を表示する（境界値）", () => {
    expect(formatBadge(99)).toBe("99");
  });

  it("unreadCount=100 のとき '99+' を表示する", () => {
    expect(formatBadge(100)).toBe("99+");
  });

  it("unreadCount=1 のとき '1' を表示する（最小表示値）", () => {
    expect(formatBadge(1)).toBe("1");
  });
});
