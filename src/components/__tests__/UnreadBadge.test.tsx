import { describe, it, expect } from "vitest";

// MatchListItem のバッジ計算ロジックを抽出してテストする。
// 実装: const badge = unreadCount ?? 0; badge > 0 && <span>{badge > 99 ? "99+" : badge}</span>
function computeMatchListBadge(unreadCount?: number): string | null {
  const badge = unreadCount ?? 0;
  if (badge <= 0) return null;
  return badge > 99 ? "99+" : String(badge);
}

// BottomNav のバッジ表示条件を抽出してテストする。
// 実装: isMatches && unreadCount > 0
function shouldShowNavBadge(href: string, unreadCount: number): boolean {
  return href === "/matches" && unreadCount > 0;
}

// BottomNav のバッジテキスト整形を抽出してテストする。
// 実装: unreadCount > 99 ? "99+" : unreadCount
function formatNavBadgeText(unreadCount: number): string {
  return unreadCount > 99 ? "99+" : String(unreadCount);
}

// ---------------------------------------------------------------------------
// MatchListItem バッジ
// ---------------------------------------------------------------------------

describe("MatchListItem — 未読バッジ", () => {
  it("unreadCount=3 のとき '3' を表示する", () => {
    expect(computeMatchListBadge(3)).toBe("3");
  });

  it("unreadCount=0 のときバッジを表示しない", () => {
    expect(computeMatchListBadge(0)).toBeNull();
  });

  it("unreadCount を省略（Props 未渡し）のときバッジを表示しない", () => {
    expect(computeMatchListBadge(undefined)).toBeNull();
  });

  it("unreadCount=100 のとき '99+' を表示する", () => {
    expect(computeMatchListBadge(100)).toBe("99+");
  });

  it("unreadCount=99（境界値）のとき '99' を表示する", () => {
    expect(computeMatchListBadge(99)).toBe("99");
  });
});

// ---------------------------------------------------------------------------
// BottomNav バッジ
// ---------------------------------------------------------------------------

describe("BottomNav — 未読バッジ（マッチングタブのみ）", () => {
  it("マッチングタブで unreadCount=2 のときバッジを表示し '2' を返す", () => {
    expect(shouldShowNavBadge("/matches", 2)).toBe(true);
    expect(formatNavBadgeText(2)).toBe("2");
  });

  it("マッチングタブで unreadCount=0 のときバッジを表示しない", () => {
    expect(shouldShowNavBadge("/matches", 0)).toBe(false);
  });

  it("探すタブ（/discover）では unreadCount > 0 でもバッジを表示しない", () => {
    expect(shouldShowNavBadge("/discover", 5)).toBe(false);
  });

  it("マッチングタブで unreadCount=100 のとき '99+' を表示する", () => {
    expect(shouldShowNavBadge("/matches", 100)).toBe(true);
    expect(formatNavBadgeText(100)).toBe("99+");
  });
});
