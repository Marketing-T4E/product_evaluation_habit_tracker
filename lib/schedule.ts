import {
  addDays,
  daysInMonth,
  diffDays,
  endOfWeek,
  isoWeekday,
  maxDate,
  minDate,
  parseISODate,
  type ISODate,
} from "./dates";
import { type Frequency } from "./frequency";

/** Representación mínima de un hábito para la lógica pura. */
export interface HabitModel {
  id: string;
  frequency: Frequency;
  /** Primer día en que el hábito está activo. */
  start_date: ISODate;
  /** Fecha local en que se archivó: el hábito está activo hasta el día anterior. */
  archived_on: ISODate | null;
}

/** Índice de cumplimientos: habitId -> conjunto de fechas cumplidas. */
export type CompletionIndex = Map<string, Set<ISODate>>;

export function buildCompletionIndex(
  rows: ReadonlyArray<{ habit_id: string; date: ISODate }>,
): CompletionIndex {
  const idx: CompletionIndex = new Map();
  for (const r of rows) {
    let set = idx.get(r.habit_id);
    if (!set) {
      set = new Set();
      idx.set(r.habit_id, set);
    }
    set.add(r.date);
  }
  return idx;
}

export function isDone(idx: CompletionIndex, habitId: string, date: ISODate): boolean {
  return idx.get(habitId)?.has(date) ?? false;
}

/** Último día activo del hábito (o null si no tiene fin). */
export function lastActiveDay(h: HabitModel): ISODate | null {
  return h.archived_on ? addDays(h.archived_on, -1) : null;
}

/** ¿El hábito existe y no está archivado en la fecha `d`? */
export function isActiveOn(h: HabitModel, d: ISODate): boolean {
  if (d < h.start_date) return false;
  if (h.archived_on && d >= h.archived_on) return false;
  return true;
}

/**
 * ¿Le toca a este hábito el día `d`? Los hábitos flexibles semanales
 * nunca están "programados" para un día concreto (devuelve false).
 */
export function isScheduledOn(h: HabitModel, d: ISODate): boolean {
  if (!isActiveOn(h, d)) return false;
  const f = h.frequency;
  switch (f.type) {
    case "daily":
      return true;
    case "every_other_day":
      return diffDays(d, h.start_date) % 2 === 0;
    case "weekly":
      return f.config.days.includes(isoWeekday(d));
    case "biweekly": {
      // Primera ocurrencia: el primer día elegido en o después de la fecha de inicio.
      const offset = (f.config.day - isoWeekday(h.start_date) + 7) % 7;
      const first = addDays(h.start_date, offset);
      const diff = diffDays(d, first);
      return diff >= 0 && diff % 14 === 0;
    }
    case "monthly": {
      const { year, month, day } = parseISODate(d);
      return day === Math.min(f.config.day, daysInMonth(year, month));
    }
    case "weekly_flexible":
      return false;
  }
}

/** Número de días activos del hábito en la semana que empieza en `weekStart` (lunes). */
export function activeDaysInWeek(h: HabitModel, weekStart: ISODate): number {
  const weekEnd = addDays(weekStart, 6);
  const from = maxDate(weekStart, h.start_date);
  const last = lastActiveDay(h);
  const to = last ? minDate(weekEnd, last) : weekEnd;
  return from > to ? 0 : diffDays(to, from) + 1;
}

/**
 * Meta efectiva de un hábito flexible para una semana. Si el hábito se creó
 * (o archivó) a mitad de semana, la meta se limita a los días activos de
 * esa semana: min(veces, días activos). 0 = la semana no se evalúa.
 */
export function flexibleWeekTarget(h: HabitModel, weekStart: ISODate): number {
  if (h.frequency.type !== "weekly_flexible") return 0;
  return Math.min(h.frequency.config.times, activeDaysInWeek(h, weekStart));
}

/** Cumplimientos del hábito en la semana (solo días activos). */
export function completionsInWeek(
  h: HabitModel,
  idx: CompletionIndex,
  weekStart: ISODate,
): number {
  const set = idx.get(h.id);
  if (!set) return 0;
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (set.has(d) && isActiveOn(h, d)) n++;
  }
  return n;
}

/** Semana ya terminada respecto a `today`. */
export function weekEnded(weekStart: ISODate, today: ISODate): boolean {
  return endOfWeek(weekStart) < today;
}

/** Fecha mínima de inicio entre varios hábitos (o null si no hay). */
export function earliestStart(habits: ReadonlyArray<HabitModel>): ISODate | null {
  let min: ISODate | null = null;
  for (const h of habits) if (min === null || h.start_date < min) min = h.start_date;
  return min;
}
