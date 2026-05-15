import { describe, it, expect } from "vitest";

// useMessages 内の Realtime INSERT ハンドラーにある markAsReadAction 呼び出し判定ロジックを抽出してテストする。
// 条件: currentUserId && newMsg.sender_id && newMsg.sender_id !== currentUserId
function shouldMarkAsRead(
  msg: { sender_id: string | null },
  currentUserId: string | undefined
): boolean {
  return !!(
    currentUserId &&
    msg.sender_id &&
    msg.sender_id !== currentUserId
  );
}

describe("useMessages — markAsReadAction 呼び出し判定", () => {
  const ME = "user-me-uuid";
  const OTHER = "user-other-uuid";

  it("相手からのメッセージを受信したとき既読マークを呼ぶ", () => {
    expect(shouldMarkAsRead({ sender_id: OTHER }, ME)).toBe(true);
  });

  it("自分が送ったメッセージでは既読マークを呼ばない", () => {
    expect(shouldMarkAsRead({ sender_id: ME }, ME)).toBe(false);
  });

  it("sender_id が null（退会済みユーザー）のメッセージでは既読マークを呼ばない", () => {
    expect(shouldMarkAsRead({ sender_id: null }, ME)).toBe(false);
  });

  it("currentUserId が undefined のときは既読マークを呼ばない", () => {
    expect(shouldMarkAsRead({ sender_id: OTHER }, undefined)).toBe(false);
  });
});
