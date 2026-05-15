import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let toUserId: string;
  try {
    const body = await req.json();
    toUserId = body.toUserId;
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (!toUserId || typeof toUserId !== "string") {
    return NextResponse.json({ error: "toUserId は必須です" }, { status: 400 });
  }

  const { error: likeError } = await supabase
    .from("likes")
    .insert({ from_user_id: user.id, to_user_id: toUserId });

  if (likeError) {
    console.log("===likeError", likeError)
    if (likeError.code === "23505") {
      return NextResponse.json({ error: "すでにいいね済みです" }, { status: 409 });
    }
    return NextResponse.json({ error: "いいねに失敗しました" }, { status: 500 });
  }

  // 逆いいねが存在するか確認（相互いいね判定）
  const { data: reverseLike } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", user.id)
    .maybeSingle();
  console.log("===reverseLike", reverseLike)
  console.log("==toUserId", toUserId)
  console.log("===user", user.id)

  if (!reverseLike) {
    return NextResponse.json({ matched: false });
  }

  // matches INSERT（user1_id < user2_id を保証）
  const user1Id = user.id < toUserId ? user.id : toUserId;
  const user2Id = user.id < toUserId ? toUserId : user.id;

  const { data: newMatch, error: matchError } = await supabase
    .from("matches")
    .insert({ user1_id: user1Id, user2_id: user2Id })
    .select("id")
    .single();

  if (matchError) {
    console.log(matchError)
    // 冪等性: 既存の match を返す
    if (matchError.code === "23505") {
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("user1_id", user1Id)
        .eq("user2_id", user2Id)
        .single();
      if (existingMatch) {
        return NextResponse.json({ matched: true, matchId: existingMatch.id });
      }
    }
    return NextResponse.json({ error: "マッチング処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ matched: true, matchId: newMatch.id });
}
