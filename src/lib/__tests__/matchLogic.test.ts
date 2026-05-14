import { describe, it, expect } from "vitest";

// user1_id < user2_id を保証する match ペア計算ロジックのテスト
function resolveMatchPair(
  a: string,
  b: string
): { user1Id: string; user2Id: string } {
  return {
    user1Id: a < b ? a : b,
    user2Id: a < b ? b : a,
  };
}

// matches テーブルの行から現在ユーザー視点でパートナー ID を返すロジック
function resolvePartnerId(
  row: { user1_id: string; user2_id: string },
  myId: string
): string {
  return row.user1_id === myId ? row.user2_id : row.user1_id;
}

describe("resolveMatchPair", () => {
  it("常に user1Id < user2Id になる", () => {
    const { user1Id, user2Id } = resolveMatchPair(
      "bbb-bbb-bbb",
      "aaa-aaa-aaa"
    );
    expect(user1Id < user2Id).toBe(true);
  });

  it("a < b のとき a が user1Id", () => {
    const { user1Id, user2Id } = resolveMatchPair("aaa", "bbb");
    expect(user1Id).toBe("aaa");
    expect(user2Id).toBe("bbb");
  });

  it("b < a のとき b が user1Id", () => {
    const { user1Id, user2Id } = resolveMatchPair("zzz", "aaa");
    expect(user1Id).toBe("aaa");
    expect(user2Id).toBe("zzz");
  });

  it("UUID 形式でも正しく順序付けられる", () => {
    const uuidA = "10000000-0000-0000-0000-000000000000";
    const uuidB = "20000000-0000-0000-0000-000000000000";
    const { user1Id, user2Id } = resolveMatchPair(uuidB, uuidA);
    expect(user1Id).toBe(uuidA);
    expect(user2Id).toBe(uuidB);
  });
});

describe("resolvePartnerId", () => {
  const myId = "aaa";
  const partnerId = "bbb";

  it("自分が user1_id のときパートナーは user2_id", () => {
    expect(
      resolvePartnerId({ user1_id: myId, user2_id: partnerId }, myId)
    ).toBe(partnerId);
  });

  it("自分が user2_id のときパートナーは user1_id", () => {
    expect(
      resolvePartnerId({ user1_id: partnerId, user2_id: myId }, myId)
    ).toBe(partnerId);
  });

  it("どちらでも同じパートナー ID を返す（対称性）", () => {
    const row = { user1_id: "zzz", user2_id: "aaa" };
    expect(resolvePartnerId(row, "zzz")).toBe("aaa");
    expect(resolvePartnerId(row, "aaa")).toBe("zzz");
  });
});
