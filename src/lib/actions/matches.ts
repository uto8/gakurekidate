"use server";

import { createClient } from "@/lib/supabase/server";
import { buildUnreadCountMap, supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult, Match, Profile } from "@/types";

// RLS で退会済みユーザーのプロフィールは取得不可なため、
// profileMap にエントリがない場合は削除済みプレースホルダーを使う
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

export async function getMatchesAction(): Promise<ActionResult<Match[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // Step 1: 自分が関与する matches を取得
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, created_at")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (matchError) {
    return { data: null, error: supabaseErrorToMessage(matchError) };
  }

  if (!matchRows || matchRows.length === 0) {
    return { data: [], error: null };
  }

  // Step 2: パートナー ID 一覧を導出
  const partnerIds = matchRows.map((m) =>
    m.user1_id === user.id ? m.user2_id : m.user1_id
  );

  // Step 3: パートナープロフィールを一括取得（退会済みは RLS で除外される）
  const { data: partnerRows, error: profileError } = await supabase
    .from("profiles_with_age")
    .select("*")
    .in("id", partnerIds);

  if (profileError) {
    return { data: null, error: supabaseErrorToMessage(profileError) };
  }

  const profileMap = new Map<string, Profile>();
  for (const p of partnerRows ?? []) {
    profileMap.set(p.id, {
      id: p.id,
      name: p.name,
      birth_date: p.birth_date,
      age: p.age ?? 0,
      gender: p.gender as Profile["gender"],
      bio: p.bio ?? null,
      photo_url: p.photo_url ?? null,
      deleted_at: p.deleted_at ?? null,
      university: p.university ?? "",
      faculty: p.faculty ?? "",
      graduation_year: p.graduation_year ?? 0,
    });
  }

  // Step 4: 各 match の最新メッセージ + 未読対象メッセージを一括取得
  const matchIds = matchRows.map((m) => m.id);

  const { data: messageRows, error: msgError } = await supabase
    .from("messages")
    .select("match_id, content, created_at, sender_id")
    .in("match_id", matchIds)
    .order("created_at", { ascending: false });

  if (msgError) {
    return { data: null, error: supabaseErrorToMessage(msgError) };
  }

  // match_id ごとに最新の 1 件だけ保持（降順取得済みなので最初のものが最新）
  const lastMessageMap = new Map<string, string | null>();
  for (const matchId of matchIds) {
    const msg = (messageRows ?? []).find((m) => m.match_id === matchId);
    lastMessageMap.set(matchId, msg?.content ?? null);
  }

  // Step 5: 未読件数を計算
  const { data: receipts } = await supabase
    .from("message_read_receipts")
    .select("match_id, last_read_at")
    .eq("user_id", user.id);

  const lastReadMap = new Map(
    receipts?.map((r) => [r.match_id, r.last_read_at]) ?? []
  );

  // messageRows は content も含む全カラム取得済みなので再利用する
  const unreadCountMap = buildUnreadCountMap(
    messageRows ?? [],
    lastReadMap,
    user.id
  );

  // Step 6: Match[] を組み立て
  const matches: Match[] = matchRows.map((row) => {
    const partnerId = row.user1_id === user.id ? row.user2_id : row.user1_id;
    const partner =
      profileMap.get(partnerId) ?? deletedPartnerProfile(partnerId);
    return {
      id: row.id,
      partner,
      created_at: row.created_at,
      last_message: lastMessageMap.get(row.id) ?? null,
      unread_count: unreadCountMap.get(row.id) ?? 0,
    };
  });

  return { data: matches, error: null };
}
