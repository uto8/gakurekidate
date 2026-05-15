import { describe, it, expect, vi, beforeEach } from "vitest";
import { markAsReadAction, getTotalUnreadCountAction } from "@/lib/actions/messages";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
const mockCreateClient = vi.mocked(createClient);

// Supabase のチェーナブルクエリビルダーをモックする。
// .select().eq().or()... はメソッドチェーンで自身を返し、
// .single() / .upsert() は Promise を返す。
// await chain（thenable）にも対応するため .then を実装する。
function makeBuilder(resolvedValue: unknown) {
  const b = {} as Record<string, unknown>;
  for (const m of [
    "select",
    "eq",
    "or",
    "neq",
    "not",
    "in",
    "order",
    "limit",
  ]) {
    b[m] = vi.fn().mockReturnValue(b);
  }
  b.single = vi.fn().mockResolvedValue(resolvedValue);
  b.upsert = vi.fn().mockResolvedValue(resolvedValue);
  b.then = (
    onFulfilled?: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
  return b;
}

type TableConfig = Record<string, unknown>;

function makeClient(config: {
  user?: { id: string } | null;
  tables?: TableConfig;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: config.user ?? null },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) =>
      makeBuilder(config.tables?.[table] ?? { data: null, error: null })
    ),
  };
}

// ---------------------------------------------------------------------------
// markAsReadAction
// ---------------------------------------------------------------------------

describe("markAsReadAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: upsert が実行され {data:null, error:null} を返す", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        user: { id: "user-1" },
        tables: {
          matches: { data: { id: "match-1" }, error: null },
          message_read_receipts: { data: null, error: null },
        },
      }) as never
    );

    const result = await markAsReadAction("match-1");

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it("べき等性: 2 回呼び出しても両方成功する", async () => {
    const clientFactory = () =>
      makeClient({
        user: { id: "user-1" },
        tables: {
          matches: { data: { id: "match-1" }, error: null },
          message_read_receipts: { data: null, error: null },
        },
      }) as never;

    mockCreateClient
      .mockResolvedValueOnce(clientFactory())
      .mockResolvedValueOnce(clientFactory());

    const [r1, r2] = await Promise.all([
      markAsReadAction("match-1"),
      markAsReadAction("match-1"),
    ]);

    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
  });

  it("forbidden: マッチが見つからない場合 {data:null, error:'forbidden'} を返す", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        user: { id: "user-1" },
        tables: {
          // single() が null data を返す → match が見つからない
          matches: { data: null, error: null },
        },
      }) as never
    );

    const result = await markAsReadAction("match-999");

    expect(result.data).toBeNull();
    expect(result.error).toBe("forbidden");
  });

  it("unauthorized: ログインユーザーなしで {data:null, error:'unauthorized'} を返す", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({ user: null }) as never
    );

    const result = await markAsReadAction("match-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe("unauthorized");
  });
});

// ---------------------------------------------------------------------------
// getTotalUnreadCountAction
// ---------------------------------------------------------------------------

describe("getTotalUnreadCountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("マッチ 0 件のとき {data:0} を即時返す", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        user: { id: "user-1" },
        tables: {
          // matches は配列を返すクエリ（thenable で解決）
          matches: { data: [], error: null },
        },
      }) as never
    );

    const result = await getTotalUnreadCountAction();

    expect(result.error).toBeNull();
    expect(result.data).toBe(0);
  });

  it("未読 3 件のとき {data:3} を返す", async () => {
    // getTotalUnreadCountAction は from() を複数テーブルに対して呼び出す。
    // テーブルごとに異なる builder を返すよう from を実装する。
    const now = new Date().toISOString();
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "matches") {
          return makeBuilder({ data: [{ id: "m1" }], error: null });
        }
        if (table === "message_read_receipts") {
          // 既読レシートなし
          return makeBuilder({ data: [], error: null });
        }
        if (table === "messages") {
          // 相手からのメッセージ 3 件（全て未読）
          return makeBuilder({
            data: [
              { match_id: "m1", sender_id: "user-2", created_at: now },
              { match_id: "m1", sender_id: "user-2", created_at: now },
              { match_id: "m1", sender_id: "user-2", created_at: now },
            ],
            error: null,
          });
        }
        return makeBuilder({ data: null, error: null });
      }),
    };

    mockCreateClient.mockResolvedValue(client as never);

    const result = await getTotalUnreadCountAction();

    expect(result.error).toBeNull();
    expect(result.data).toBe(3);
  });

  it("既読レシートがある場合、既読分を除いた件数を返す", async () => {
    const old = "2024-01-01T00:00:00.000Z";
    const recent = "2024-06-01T00:00:00.000Z";
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "matches") {
          return makeBuilder({ data: [{ id: "m1" }], error: null });
        }
        if (table === "message_read_receipts") {
          // old 時刻まで既読
          return makeBuilder({
            data: [{ match_id: "m1", last_read_at: old }],
            error: null,
          });
        }
        if (table === "messages") {
          return makeBuilder({
            data: [
              // old より前 → 既読扱い
              { match_id: "m1", sender_id: "user-2", created_at: "2023-12-31T00:00:00.000Z" },
              // recent（old より後）→ 未読
              { match_id: "m1", sender_id: "user-2", created_at: recent },
            ],
            error: null,
          });
        }
        return makeBuilder({ data: null, error: null });
      }),
    };

    mockCreateClient.mockResolvedValue(client as never);

    const result = await getTotalUnreadCountAction();

    expect(result.error).toBeNull();
    expect(result.data).toBe(1);
  });

  it("自分が送信したメッセージはカウントしない", async () => {
    const now = new Date().toISOString();
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "matches") {
          return makeBuilder({ data: [{ id: "m1" }], error: null });
        }
        if (table === "message_read_receipts") {
          return makeBuilder({ data: [], error: null });
        }
        if (table === "messages") {
          return makeBuilder({
            data: [
              // 自分の送信 → DB クエリで sender_id != uid によって除外される想定
              // ここでは actions 側が .neq("sender_id", uid) で絞るため
              // モックには相手メッセージ 1 件のみ返す
              { match_id: "m1", sender_id: "user-2", created_at: now },
            ],
            error: null,
          });
        }
        return makeBuilder({ data: null, error: null });
      }),
    };

    mockCreateClient.mockResolvedValue(client as never);

    const result = await getTotalUnreadCountAction();

    expect(result.error).toBeNull();
    expect(result.data).toBe(1);
  });

  it("sender_id が null（退会済み）のメッセージはカウントしない", async () => {
    const now = new Date().toISOString();
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "matches") {
          return makeBuilder({ data: [{ id: "m1" }], error: null });
        }
        if (table === "message_read_receipts") {
          return makeBuilder({ data: [], error: null });
        }
        if (table === "messages") {
          // actions 側が .not("sender_id", "is", null) で除外するため
          // モックには null sender がない（0 件）状態を返す
          return makeBuilder({
            data: [
              { match_id: "m1", sender_id: null, created_at: now },
            ],
            error: null,
          });
        }
        return makeBuilder({ data: null, error: null });
      }),
    };

    mockCreateClient.mockResolvedValue(client as never);

    // buildUnreadCountMap が sender_id=null を除外する
    const result = await getTotalUnreadCountAction();

    expect(result.error).toBeNull();
    expect(result.data).toBe(0);
  });

  it("unauthorized: ログインユーザーなしで {data:null, error:'unauthorized'} を返す", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({ user: null }) as never
    );

    const result = await getTotalUnreadCountAction();

    expect(result.data).toBeNull();
    expect(result.error).toBe("unauthorized");
  });
});
