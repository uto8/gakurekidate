"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdult, supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult, Profile } from "@/types";

export async function createProfileAction(
  formData: FormData
): Promise<ActionResult<null>> {
  const name = (formData.get("name") as string).trim();
  const birthDate = formData.get("birth_date") as string;
  const gender = formData.get("gender") as string;
  const bio = (formData.get("bio") as string).trim() || null;
  const university = (formData.get("university") as string).trim();
  const faculty = (formData.get("faculty") as string).trim();
  const graduationYear = parseInt(formData.get("graduation_year") as string, 10);

  if (!name || !birthDate || !gender || !university || !faculty) {
    return { data: null, error: "必須項目を入力してください" };
  }

  if (!isAdult(birthDate)) {
    return { data: null, error: "18歳未満の方は登録できません" };
  }

  if (isNaN(graduationYear) || graduationYear < 1900 || graduationYear > 2050) {
    return { data: null, error: "卒業年度が正しくありません" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    name,
    birth_date: birthDate,
    gender,
    bio,
  });

  if (profileError) {
    return { data: null, error: supabaseErrorToMessage(profileError) };
  }

  const { error: educationError } = await supabase
    .from("educations")
    .upsert(
      { user_id: user.id, university, faculty, graduation_year: graduationYear },
      { onConflict: "user_id" }
    );

  if (educationError) {
    return { data: null, error: supabaseErrorToMessage(educationError) };
  }

  redirect("/discover");
}

export async function getUserProfileAction(
  userId: string
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles_with_age")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  if (!data) {
    return { data: null, error: "USER_NOT_FOUND" };
  }

  return {
    data: {
      id: data.id,
      name: data.name,
      birth_date: data.birth_date,
      age: data.age ?? 0,
      gender: data.gender as Profile["gender"],
      bio: data.bio ?? null,
      photo_url: data.photo_url ?? null,
      deleted_at: data.deleted_at ?? null,
      university: data.university ?? "",
      faculty: data.faculty ?? "",
      graduation_year: data.graduation_year ?? 0,
    },
    error: null,
  };
}

export async function getMyProfileAction(): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("profiles_with_age")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  if (!data) {
    return { data: null, error: "プロフィールが見つかりません" };
  }

  return {
    data: {
      id: data.id,
      name: data.name,
      birth_date: data.birth_date,
      age: data.age ?? 0,
      gender: data.gender as Profile["gender"],
      bio: data.bio ?? null,
      photo_url: data.photo_url ?? null,
      deleted_at: data.deleted_at ?? null,
      university: data.university ?? "",
      faculty: data.faculty ?? "",
      graduation_year: data.graduation_year ?? 0,
    },
    error: null,
  };
}

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult<null>> {
  const name = (formData.get("name") as string).trim();
  const bio = (formData.get("bio") as string | null)?.trim() || null;
  const university = (formData.get("university") as string).trim();
  const faculty = (formData.get("faculty") as string).trim();
  const graduationYear = parseInt(formData.get("graduation_year") as string, 10);

  if (!name || !university || !faculty) {
    return { data: null, error: "必須項目を入力してください" };
  }

  if (isNaN(graduationYear) || graduationYear < 1900 || graduationYear > 2050) {
    return { data: null, error: "卒業年度が正しくありません" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name, bio, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return { data: null, error: supabaseErrorToMessage(profileError) };
  }

  const { error: educationError } = await supabase
    .from("educations")
    .update({ university, faculty, graduation_year: graduationYear, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (educationError) {
    return { data: null, error: supabaseErrorToMessage(educationError) };
  }

  return { data: null, error: null };
}

export async function updatePhotoUrlAction(
  photoUrl: string
): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  return { data: null, error: null };
}
