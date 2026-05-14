"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseErrorToMessage } from "@/lib/utils";
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
