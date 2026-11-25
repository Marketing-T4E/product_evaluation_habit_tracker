"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUser } from "@/lib/data";
import { fieldErrors, frequencyToColumns, parseHabitFormData, toggleSchema } from "@/lib/validation";
import { parseFrequency } from "@/lib/frequency";
import { canLogHabitOn, isLoggableDate } from "@/lib/today";
import type { HabitModel } from "@/lib/schedule";
import type { FormState } from "./auth";

const idSchema = z.uuid();

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseHabitFormData(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { supabase, user } = await requireUser();
  const { frequency, ...rest } = parsed.data;
  const { error } = await supabase.from("habits").insert({
    ...rest,
    ...frequencyToColumns(frequency),
    user_id: user.id,
  });
  if (error) return { error: "No se pudo crear el hábito. Inténtalo de nuevo." };

  revalidateAll();
  redirect("/habits?created=1");
}

export async function updateHabit(
  habitId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!idSchema.safeParse(habitId).success) return { error: "Hábito inválido." };
  const parsed = parseHabitFormData(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { supabase, user } = await requireUser();
  const { frequency, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from("habits")
    .update({ ...rest, ...frequencyToColumns(frequency) })
    .eq("id", habitId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: "No se pudo guardar el hábito. Inténtalo de nuevo." };
  if (!data || data.length === 0) return { error: "El hábito no existe." };

  revalidateAll();
  redirect("/habits?updated=1");
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function setArchived(habitId: string, archived: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(habitId).success) return { ok: false, error: "Hábito inválido." };
  const { supabase, user } = await requireUser();
  const profile = await getProfile();
  const { data, error } = await supabase
    .from("habits")
    .update({ archived_on: archived ? profile.today : null })
    .eq("id", habitId)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo actualizar el hábito." };
  revalidateAll();
  return { ok: true };
}

export async function archiveHabit(habitId: string): Promise<ActionResult> {
  return setArchived(habitId, true);
}

export async function restoreHabit(habitId: string): Promise<ActionResult> {
  return setArchived(habitId, false);
}

export async function deleteHabit(habitId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(habitId).success) return { ok: false, error: "Hábito inválido." };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se pudo eliminar el hábito." };
  revalidateAll();
  return { ok: true };
}

/** Marca o desmarca un hábito como cumplido en una fecha local. */
export async function toggleCompletion(input: {
  habitId: string;
  date: string;
  done: boolean;
}): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { habitId, date, done } = parsed.data;

  const { supabase, user } = await requireUser();
  const profile = await getProfile();
  if (!isLoggableDate(date, profile.today)) {
    return { ok: false, error: "Solo puedes registrar hasta 7 días atrás y nunca días futuros." };
  }

  const { data: row, error: habitError } = await supabase
    .from("habits")
    .select("id, frequency_type, frequency_config, start_date, archived_on")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (habitError || !row) return { ok: false, error: "El hábito no existe." };

  const frequency = parseFrequency(row.frequency_type, row.frequency_config);
  if (!frequency) return { ok: false, error: "El hábito tiene una configuración inválida." };
  const model: HabitModel = {
    id: row.id,
    frequency,
    start_date: row.start_date,
    archived_on: row.archived_on,
  };
  if (!canLogHabitOn(model, date)) {
    return { ok: false, error: "Este hábito no está programado para ese día." };
  }

  if (done) {
    const { error } = await supabase
      .from("habit_completions")
      .upsert(
        { habit_id: habitId, user_id: user.id, date },
        { onConflict: "habit_id,date", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: "No se pudo guardar el registro." };
  } else {
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", user.id)
      .eq("date", date);
    if (error) return { ok: false, error: "No se pudo quitar el registro." };
  }

  revalidateAll();
  return { ok: true };
}
