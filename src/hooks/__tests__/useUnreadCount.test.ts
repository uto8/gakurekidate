import { describe, it, expect } from "vitest";

// useUnreadCount 内の messages INSERT 購読ハンドラーにある判定ロジックを抽出してテストする。
// 条件: msg.sender_id && msg.sender_id !== userId
function shouldRefreshOnMessageInsert(
  msg: { sender_id: string | null },
  userId: string
): boolean {
  return !!(msg.sender_id && msg.sender_id !== userId);
}

describe("useUnreadCount — messages INSERT イベントフィルタ", () => {
  const ME = "user-me-uuid";
  const OTHER = "user-other-uuid";

  it("相手からのメッセージは refresh を呼ぶ", () => {
    expect(shouldRefreshOnMessageInsert({ sender_id: OTHER }, ME)).toBe(true);
  });

  it("自分が送ったメッセージは refresh を呼ばない", () => {
    expect(shouldRefreshOnMessageInsert({ sender_id: ME }, ME)).toBe(false);
  });

  it("sender_id が null（退会済みユーザー）のメッセージは refresh を呼ばない", () => {
    expect(shouldRefreshOnMessageInsert({ sender_id: null }, ME)).toBe(false);
  });

  it("sender_id が空文字の場合も refresh を呼ばない（falsy ガード）", () => {
    expect(shouldRefreshOnMessageInsert({ sender_id: "" }, ME)).toBe(false);
  });
});
