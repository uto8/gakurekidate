"use server";

import { createClient } from "@/lib/supabase/server";
import { buildUnreadCountMap, supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult, Match, Message, Profile } from "@/types";

function deletedPartnerProfile(id: string): Profile {
  return {
    id,
    name: "退会済みユーザー",
    birth_date: "1990-01-01",
    age: 0,
    gender: "male",
    bio: null,
    photo_url: null,
    deleted_at: "deleted",
    university: "",
    faculty: "",
    graduation_year: 0,
  };
}

/** matchId からマッチ情報（相手プロフィール含む）を取得する */
export async function getMatchAction(
  matchId: string
): Promise<ActionResult<Match>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, created_at")
    .eq("id", matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (matchError) {
    return { data: null, error: supabaseErrorToMessage(matchError) };
  }

  const partnerId =
    matchRow.user1_id === user.id ? matchRow.user2_id : matchRow.user1_id;

  const { data: partnerRow } = await supabase
    .from("profiles_with_age")
    .select("*")
    .eq("id", partnerId)
    .single();

  const partner: Profile = partnerRow
    ? {
        id: partnerRow.id,
        name: partnerRow.name,
        birth_date: partnerRow.birth_date,
        age: partnerRow.age ?? 0,
        gender: partnerRow.gender as Profile["gender"],
        bio: partnerRow.bio ?? null,
        photo_url: partnerRow.photo_url ?? null,
        deleted_at: partnerRow.deleted_at ?? null,
        university: partnerRow.university ?? "",
        faculty: partnerRow.faculty ?? "",
        graduation_year: partnerRow.graduation_year ?? 0,
      }
    : deletedPartnerProfile(partnerId);

  return {
    data: {
      id: matchRow.id,
      partner,
      created_at: matchRow.created_at,
      last_message: null,
      unread_count: 0,
    },
    error: null,
  };
}

/** matchId のメッセージ一覧を時系列昇順で取得する（最大 100 件） */
export async function getMessagesAction(
  matchId: string
): Promise<ActionResult<Message[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data: rows, error } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  const messages: Message[] = (rows ?? []).map((r) => ({
    id: r.id,
    match_id: r.match_id,
    sender_id: r.sender_id ?? null,
    content: r.content,
    created_at: r.created_at,
  }));

  return { data: messages, error: null };
}

/**
 * 指定マッチを現在時刻で既読マークする（UPSERT）。
 * fire-and-forget での呼び出しを想定。失敗しても画面表示には影響しない。
 */
export async function markAsReadAction(
  matchId: string
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "unauthorized" };
  }

  // RLS に加えてアプリ層でも参加者確認
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (!match) {
    return { data: null, error: "forbidden" };
  }

  const { error } = await supabase.from("message_read_receipts").upsert(
    {
      match_id: matchId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "match_id,user_id" }
  );

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  return { data: null, error: null };
}

/**
 * ログインユーザーの全マッチを横断した合計未読メッセージ数を返す。
 * userId を渡すと getUser() の二重呼び出しを避けられる（layout.tsx 向け）。
 */
export async function getTotalUnreadCountAction(
  userId?: string
): Promise<ActionResult<number>> {
  const supabase = await createClient();

  let uid = userId;
  if (!uid) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return { data: null, error: "unauthorized" };
    }
    uid = user.id;
  }

  // Step 1: 自分の全マッチ ID を取得
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

  if (matchError) {
    return { data: null, error: supabaseErrorToMessage(matchError) };
  }

  const matchIds = matchRows?.map((m) => m.id) ?? [];

  // マッチが 0 件（新規ユーザー）は即時 0 を返す
  // Supabase JS の .in('col', []) は未定義の挙動になるため空配列ガードが必須
  if (matchIds.length === 0) {
    return { data: 0, error: null };
  }

  // Step 2: 自分の全既読レコードを取得
  const { data: receipts, error: receiptError } = await supabase
    .from("message_read_receipts")
    .select("match_id, last_read_at")
    .eq("user_id", uid);

  if (receiptError) {
    return { data: null, error: supabaseErrorToMessage(receiptError) };
  }

  const lastReadMap = new Map(
    receipts?.map((r) => [r.match_id, r.last_read_at]) ?? []
  );

  // Step 3: 全マッチの未読対象メッセージを一括取得（自分の送信・退会済みは除外）
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("match_id, sender_id, created_at")
    .in("match_id", matchIds)
    .neq("sender_id", uid)
    .not("sender_id", "is", null);

  if (msgError) {
    return { data: null, error: supabaseErrorToMessage(msgError) };
  }

  // Step 4: per-match 未読数 Map を作り合計を返す
  const countMap = buildUnreadCountMap(messages ?? [], lastReadMap, uid);
  let total = 0;
  for (const count of countMap.values()) total += count;

  return { data: total, error: null };
}

/** メッセージを送信する */
export async function sendMessageAction(
  matchId: string,
  content: string
): Promise<ActionResult<Message>> {
  if (!content || content.trim().length === 0) {
    return { data: null, error: "メッセージを入力してください" };
  }
  if (content.length > 1000) {
    return { data: null, error: "メッセージは1000文字以内で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 自分がこのマッチの参加者かを確認（RLS でも弾かれるが明示チェック）
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (matchError || !matchRow) {
    return { data: null, error: "マッチが見つかりません" };
  }

  const { data: row, error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: user.id, content: content.trim() })
    .select("id, match_id, sender_id, content, created_at")
    .single();

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  return {
    data: {
      id: row.id,
      match_id: row.match_id,
      sender_id: row.sender_id ?? null,
      content: row.content,
      created_at: row.created_at,
    },
    error: null,
  };
}
