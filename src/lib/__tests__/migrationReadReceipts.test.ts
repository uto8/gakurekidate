import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildUnreadCountMap } from "../utils";

// ---------------------------------------------------------------------------
// F-001 マイグレーションファイル構造テスト
// ---------------------------------------------------------------------------
describe("migration: message_read_receipts", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/20260515000004_message_read_receipts.sql"
    ),
    "utf-8"
  );

  it("テーブル作成文が含まれている", () => {
    expect(sql).toMatch(/create table public\.message_read_receipts/i);
  });

  it("match_id FK が matches テーブルを参照している", () => {
    expect(sql).toMatch(/references public\.matches\(id\)/i);
  });

  it("user_id FK が profiles テーブルを参照している", () => {
    expect(sql).toMatch(/references public\.profiles\(id\)/i);
  });

  it("複合 PRIMARY KEY が (match_id, user_id) になっている", () => {
    expect(sql).toMatch(/primary key \(match_id, user_id\)/i);
  });

  it("RLS が有効化されている", () => {
    expect(sql).toMatch(
      /alter table public\.message_read_receipts enable row level security/i
    );
  });

  it("SELECT ポリシー read_receipts_select が存在する", () => {
    expect(sql).toContain('"read_receipts_select"');
    expect(sql).toMatch(/for select/i);
  });

  it("INSERT ポリシー read_receipts_write が存在する", () => {
    expect(sql).toContain('"read_receipts_write"');
    expect(sql).toMatch(/for insert/i);
  });

  it("UPDATE ポリシー read_receipts_update が存在する", () => {
    expect(sql).toContain('"read_receipts_update"');
    expect(sql).toMatch(/for update/i);
  });

  it("DELETE ポリシーが存在しない（意図的な除外）", () => {
    expect(sql).not.toMatch(/for delete/i);
  });

  it("is_match_participant() を RLS で使用している", () => {
    expect(sql).toMatch(/is_match_participant/i);
  });

  it("user_id インデックスが存在する", () => {
    expect(sql).toContain("idx_read_receipts_user");
  });

  it("replica identity full が設定されている", () => {
    expect(sql).toMatch(/replica identity full/i);
  });

  it("supabase_realtime publication に追加されている", () => {
    expect(sql).toMatch(
      /alter publication supabase_realtime add table public\.message_read_receipts/i
    );
  });
});

// ---------------------------------------------------------------------------
// buildUnreadCountMap ユニットテスト（src/lib/utils.ts）
// F-005 getTotalUnreadCountAction / F-006 getMatchesAction で使用する
// ---------------------------------------------------------------------------

type MsgRow = {
  match_id: string;
  sender_id: string | null;
  created_at: string;
};

/** buildUnreadCountMap の返す Map の全値を合計して総未読数を返すヘルパー */
function sumMap(map: Map<string, number>): number {
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}

const ME = "user-me";
const OTHER = "user-other";
const MATCH_A = "match-a";
const MATCH_B = "match-b";

describe("buildUnreadCountMap — 合計件数", () => {
  it("既読レコードがない（初回訪問）場合は全対象メッセージをカウントする", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T10:00:00Z" },
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T11:00:00Z" },
    ];
    expect(sumMap(buildUnreadCountMap(messages, new Map(), ME))).toBe(2);
  });

  it("last_read_at より後のメッセージのみカウントする", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T09:00:00Z" }, // 既読前
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T10:00:00Z" }, // 既読と同時刻（除外）
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T11:00:00Z" }, // 未読
    ];
    const lastReadMap = new Map([[MATCH_A, "2026-05-15T10:00:00Z"]]);
    expect(sumMap(buildUnreadCountMap(messages, lastReadMap, ME))).toBe(1);
  });

  it("自分が送ったメッセージ（sender_id === currentUserId）は未読カウントに含まない", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: ME, created_at: "2026-05-15T11:00:00Z" },
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T12:00:00Z" },
    ];
    expect(sumMap(buildUnreadCountMap(messages, new Map(), ME))).toBe(1);
  });

  it("sender_id が null（退会済みユーザー）のメッセージは未読カウントに含まない", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: null, created_at: "2026-05-15T11:00:00Z" },
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T12:00:00Z" },
    ];
    expect(sumMap(buildUnreadCountMap(messages, new Map(), ME))).toBe(1);
  });

  it("複数マッチにまたがる未読を合算する", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T11:00:00Z" },
      { match_id: MATCH_B, sender_id: OTHER, created_at: "2026-05-15T12:00:00Z" },
      { match_id: MATCH_B, sender_id: OTHER, created_at: "2026-05-15T13:00:00Z" },
    ];
    expect(sumMap(buildUnreadCountMap(messages, new Map(), ME))).toBe(3);
  });

  it("全メッセージが既読の場合は 0 を返す", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T09:00:00Z" },
    ];
    const lastReadMap = new Map([[MATCH_A, "2026-05-15T10:00:00Z"]]);
    expect(sumMap(buildUnreadCountMap(messages, lastReadMap, ME))).toBe(0);
  });

  it("messages が空配列の場合は 0 を返す", () => {
    expect(sumMap(buildUnreadCountMap([], new Map(), ME))).toBe(0);
  });

  it("last_read_at と同時刻のメッセージは既読扱いになる（> のみ未読）", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T10:00:00Z" },
    ];
    const lastReadMap = new Map([[MATCH_A, "2026-05-15T10:00:00Z"]]);
    expect(sumMap(buildUnreadCountMap(messages, lastReadMap, ME))).toBe(0);
  });
});

describe("buildUnreadCountMap — per-match 件数（getMatchesAction 向け）", () => {
  it("per-match の未読件数が正しくセットされる", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T11:00:00Z" },
      { match_id: MATCH_B, sender_id: OTHER, created_at: "2026-05-15T12:00:00Z" },
      { match_id: MATCH_B, sender_id: OTHER, created_at: "2026-05-15T13:00:00Z" },
    ];
    const result = buildUnreadCountMap(messages, new Map(), ME);
    expect(result.get(MATCH_A)).toBe(1);
    expect(result.get(MATCH_B)).toBe(2);
  });

  it("未読がないマッチは Map に含まれない（undefined）", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T09:00:00Z" },
    ];
    const lastReadMap = new Map([[MATCH_A, "2026-05-15T10:00:00Z"]]);
    const result = buildUnreadCountMap(messages, lastReadMap, ME);
    expect(result.get(MATCH_A)).toBeUndefined();
  });

  it("既読済みマッチと未読マッチが混在する場合、未読のみ Map に含まれる", () => {
    const messages: MsgRow[] = [
      { match_id: MATCH_A, sender_id: OTHER, created_at: "2026-05-15T09:00:00Z" }, // 既読
      { match_id: MATCH_B, sender_id: OTHER, created_at: "2026-05-15T12:00:00Z" }, // 未読
    ];
    const lastReadMap = new Map([[MATCH_A, "2026-05-15T10:00:00Z"]]);
    const result = buildUnreadCountMap(messages, lastReadMap, ME);
    expect(result.get(MATCH_A)).toBeUndefined();
    expect(result.get(MATCH_B)).toBe(1);
  });
});
