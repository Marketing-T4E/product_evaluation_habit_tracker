import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { todayInTimeZone, type ISODate } from "./dates";
import { toHabits, type CompletionRow, type Habit, type HabitRow, type ProfileRow } from "./types";

const HABIT_COLUMNS =
  "id, user_id, name, description, color, icon, frequency_type, frequency_config, start_date, archived_on, created_at";

/** Usuario autenticado (validado contra Supabase Auth) o redirección al login. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

export const getProfile = cache(async (): Promise<ProfileRow & { today: ISODate }> => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, timezone, streak_threshold")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);

  // Si el trigger aún no creó el perfil (p. ej. usuarios previos a la migración), lo creamos.
  let profile = data as ProfileRow | null;
  if (!profile) {
    const fallback = {
      id: user.id,
      name: String(user.user_metadata?.name ?? user.email?.split("@")[0] ?? ""),
      timezone: "UTC",
      streak_threshold: 100,
    };
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .upsert(fallback)
      .select("id, name, timezone, streak_threshold")
      .single();
    if (insertError) throw new Error(`No se pudo crear el perfil: ${insertError.message}`);
    profile = created as ProfileRow;
  }
  return { ...profile, today: todayInTimeZone(profile.timezone) };
});

export const getHabits = cache(async (): Promise<{ active: Habit[]; archived: Habit[]; all: Habit[] }> => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los hábitos: ${error.message}`);
  const all = toHabits((data ?? []) as HabitRow[]);
  return {
    all,
    active: all.filter((h) => h.archived_on === null),
    archived: all.filter((h) => h.archived_on !== null),
  };
});

export async function getHabit(id: string): Promise<Habit | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el hábito: ${error.message}`);
  if (!data) return null;
  return toHabits([data as HabitRow])[0] ?? null;
}

const PAGE_SIZE = 1000;

/**
 * Todos los cumplimientos del usuario (paginado: la API de Supabase
 * devuelve como máximo 1000 filas por request).
 */
export const getCompletions = cache(async (from?: ISODate): Promise<CompletionRow[]> => {
  const { supabase, user } = await requireUser();
  const rows: CompletionRow[] = [];
  for (let page = 0; ; page++) {
    let query = supabase
      .from("habit_completions")
      .select("habit_id, date")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("habit_id", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (from) query = query.gte("date", from);
    const { data, error } = await query;
    if (error) throw new Error(`No se pudieron cargar los registros: ${error.message}`);
    rows.push(...((data ?? []) as CompletionRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
});
