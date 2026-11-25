"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { fieldErrors, profileInputSchema } from "@/lib/validation";
import type { FormState } from "./auth";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileInputSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    streak_threshold: formData.get("streak_threshold"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "No se pudieron guardar los ajustes." };

  revalidatePath("/", "layout");
  return { message: "Ajustes guardados." };
}
