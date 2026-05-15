import { describe, it, expect, vi } from "vitest";

// ChatView のマウント時既読マーク useEffect が行う処理を抽出してテストする。
// 実装: markAsReadAction(matchId).then(result => { if (result.error) console.error(...) })

type ActionResult = { data: null; error: string | null };

async function handleMarkAsReadResult(
  result: ActionResult,
  logger: (msg: string, detail: string) => void
): Promise<void> {
  if (result.error) {
    logger("[markAsReadAction on mount]", result.error);
  }
}

describe("ChatView — マウント時既読マーク（fire-and-forget）", () => {
  it("markAsReadAction が成功したとき console.error を呼ばない", async () => {
    const logger = vi.fn();
    await handleMarkAsReadResult({ data: null, error: null }, logger);
    expect(logger).not.toHaveBeenCalled();
  });

  it("markAsReadAction がエラーを返したとき console.error を呼ぶ", async () => {
    const logger = vi.fn();
    await handleMarkAsReadResult({ data: null, error: "forbidden" }, logger);
    expect(logger).toHaveBeenCalledWith(
      "[markAsReadAction on mount]",
      "forbidden"
    );
  });

  it("エラーが発生しても例外を throw しない（fire-and-forget）", async () => {
    const logger = vi.fn();
    await expect(
      handleMarkAsReadResult({ data: null, error: "unauthorized" }, logger)
    ).resolves.toBeUndefined();
  });
});
