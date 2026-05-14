"use server";

import { createClient } from "@/lib/supabase/server";
import { calcBirthDateBound, supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult, Profile } from "@/types";

export type DiscoverParams = {
  ageMin?: number;
  ageMax?: number;
  university?: string;
  page: number;
};

const PAGE_SIZE = 20;

export async function getDiscoverUsersAction(
  params: DiscoverParams
): Promise<ActionResult<Profile[]>> {
  const { ageMin, ageMax, university, page } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 自分の性別を取得して異性を求める
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile) {
    return { data: null, error: "プロフィールが見つかりません" };
  }

  const oppositeGender = myProfile.gender === "male" ? "female" : "male";

  let query = supabase
    .from("profiles_with_age")
    .select("*")
    .eq("gender", oppositeGender)
    .is("deleted_at", null)
    .neq("id", user.id);

  // 年齢フィルター: birth_date の範囲に変換
  // age_min=25 → birth_date <= calcBirthDateBound(25) (25歳以上)
  // age_max=32 → birth_date >= calcBirthDateBound(32) (32歳以下)
  if (ageMin !== undefined) {
    query = query.lte("birth_date", calcBirthDateBound(ageMin));
  }
  if (ageMax !== undefined) {
    query = query.gte("birth_date", calcBirthDateBound(ageMax));
  }

  // 大学名キーワード（部分一致・大文字小文字無視）
  if (university && university.trim()) {
    query = query.ilike("university", `%${university.trim()}%`);
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to).order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  const profiles: Profile[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    birth_date: row.birth_date,
    age: row.age ?? 0,
    gender: row.gender as Profile["gender"],
    bio: row.bio ?? null,
    photo_url: row.photo_url ?? null,
    deleted_at: row.deleted_at ?? null,
    university: row.university ?? "",
    faculty: row.faculty ?? "",
    graduation_year: row.graduation_year ?? 0,
  }));

  return { data: profiles, error: null };
}
