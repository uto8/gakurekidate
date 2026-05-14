"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseErrorToMessage } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function registerAction(
  formData: FormData
): Promise<ActionResult<null>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  redirect("/onboarding");
}

export async function loginAction(
  formData: FormData
): Promise<ActionResult<null>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { data: null, error: supabaseErrorToMessage(error) };
  }

  redirect("/discover");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
