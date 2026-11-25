import type { ISODate } from "./dates";
import { parseFrequency, type FrequencyType } from "./frequency";
import type { HabitModel } from "./schedule";

export interface ProfileRow {
  id: string;
  name: string;
  timezone: string;
  streak_threshold: number;
}

export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  frequency_type: FrequencyType;
  frequency_config: unknown;
  start_date: ISODate;
  archived_on: ISODate | null;
  created_at: string;
}

export interface CompletionRow {
  habit_id: string;
  date: ISODate;
}

/** Hábito listo para la UI y la lógica pura. */
export interface Habit extends HabitModel {
  name: string;
  description: string | null;
  color: string;
  icon: string;
}

/** Convierte filas de la BD en `Habit`; descarta las que tienen configuración inválida. */
export function toHabits(rows: ReadonlyArray<HabitRow>): Habit[] {
  const out: Habit[] = [];
  for (const r of rows) {
    const frequency = parseFrequency(r.frequency_type, r.frequency_config);
    if (!frequency) continue;
    out.push({
      id: r.id,
      name: r.name,
      description: r.description,
      color: r.color,
      icon: r.icon,
      frequency,
      start_date: r.start_date,
      archived_on: r.archived_on,
    });
  }
  return out;
}
