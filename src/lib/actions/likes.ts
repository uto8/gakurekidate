"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult, Profile } from "@/types";

export async function getReceivedLikesAction(): Promise<ActionResult<Profile[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("from_user_id")
    .eq("to_user_id", user.id);

  if (likesError) {
    return { data: null, error: supabaseErrorToMessage(likesError) };
  }

  if (!likes || likes.length === 0) {
    return { data: [], error: null };
  }

  const fromIds = likes.map((l) => l.from_user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles_with_age")
    .select("*")
    .in("id", fromIds)
    .is("deleted_at", null);

  if (profilesError) {
    return { data: null, error: supabaseErrorToMessage(profilesError) };
  }

  return { data: (profiles ?? []) as Profile[], error: null };
}

export async function getLikeStatusAction(
  toUserId: string
): Promise<ActionResult<boolean>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", toUserId)
    .maybeSingle();

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  return { data: data !== null, error: null };
}
