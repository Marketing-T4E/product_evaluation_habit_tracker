import { addDays, eachDay, endOfWeek, isoWeekday, startOfWeek, type ISODate } from "./dates";
import {
  completionsInWeek,
  earliestStart,
  flexibleWeekTarget,
  isDone,
  isScheduledOn,
  lastActiveDay,
  type CompletionIndex,
  type HabitModel,
} from "./schedule";

export type DayStatus = "success" | "fail" | "neutral";

export interface StreakResult {
  current: number;
  best: number;
}

/**
 * Estado de cada día para el streak global.
 *
 * - Un día es "success" si (cumplidos / programados) >= umbral, considerando
 *   solo hábitos no flexibles programados y activos ese día.
 * - Sin hábitos programados → "neutral" (no suma ni rompe).
 * - Hoy nunca es "fail": si aún no se cumple, es "neutral".
 * - Los hábitos flexibles se evalúan al cerrar la semana: si alguno no llegó
 *   a su meta, el domingo de esa semana pasa a "fail".
 */
export function globalDayStatuses(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  today: ISODate,
  thresholdPct: number,
): Map<ISODate, DayStatus> {
  const statuses = new Map<ISODate, DayStatus>();
  const start = earliestStart(habits);
  if (!start || start > today) return statuses;

  const fixed = habits.filter((h) => h.frequency.type !== "weekly_flexible");
  const flexible = habits.filter((h) => h.frequency.type === "weekly_flexible");
  const threshold = Math.min(100, Math.max(1, thresholdPct));

  for (const d of eachDay(start, today)) {
    let scheduled = 0;
    let done = 0;
    for (const h of fixed) {
      if (isScheduledOn(h, d)) {
        scheduled++;
        if (isDone(idx, h.id, d)) done++;
      }
    }
    let status: DayStatus =
      scheduled === 0 ? "neutral" : done * 100 >= threshold * scheduled ? "success" : "fail";
    if (d === today && status === "fail") status = "neutral";

    // Cierre de semana: domingo ya terminado.
    if (isoWeekday(d) === 7 && d < today) {
      const ws = startOfWeek(d);
      for (const h of flexible) {
        const target = flexibleWeekTarget(h, ws);
        if (target > 0 && completionsInWeek(h, idx, ws) < target) {
          status = "fail";
          break;
        }
      }
    }
    statuses.set(d, status);
  }
  return statuses;
}

/** Calcula streak actual y récord a partir de una secuencia ordenada de estados. */
export function streakFromStatuses(statuses: ReadonlyArray<DayStatus>): StreakResult {
  let best = 0;
  let run = 0;
  for (const s of statuses) {
    if (s === "success") {
      run++;
      if (run > best) best = run;
    } else if (s === "fail") {
      run = 0;
    }
  }
  let current = 0;
  for (let i = statuses.length - 1; i >= 0; i--) {
    const s = statuses[i];
    if (s === "fail") break;
    if (s === "success") current++;
  }
  return { current, best };
}

export function computeGlobalStreak(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  today: ISODate,
  thresholdPct: number,
): StreakResult {
  const statuses = globalDayStatuses(habits, idx, today, thresholdPct);
  return streakFromStatuses(Array.from(statuses.values()));
}

export type PeriodStatus = "success" | "fail" | "pending";

export interface HabitPeriod {
  start: ISODate;
  end: ISODate;
  status: PeriodStatus;
}

/**
 * Periodos de un hábito en su unidad natural:
 * - diario / día por medio / quincenal / mensual: cada ocurrencia programada.
 * - semanal (días fijos): cada semana con al menos un día programado; se
 *   cumple si se completaron todos los días programados de esa semana.
 * - flexible semanal: cada semana; se cumple al alcanzar la meta.
 * Un periodo en curso que todavía puede cumplirse queda "pending".
 */
export function habitPeriods(
  h: HabitModel,
  idx: CompletionIndex,
  today: ISODate,
): HabitPeriod[] {
  const periods: HabitPeriod[] = [];
  if (h.start_date > today) return periods;
  const last = lastActiveDay(h);
  const end = last && last < today ? last : today;
  if (end < h.start_date) return periods;

  const f = h.frequency;
  if (f.type === "weekly" || f.type === "weekly_flexible") {
    for (let ws = startOfWeek(h.start_date); ws <= end; ws = addDays(ws, 7)) {
      const we = endOfWeek(ws);
      if (f.type === "weekly_flexible") {
        const target = flexibleWeekTarget(h, ws);
        if (target === 0) continue;
        const count = completionsInWeek(h, idx, ws);
        const status: PeriodStatus =
          count >= target ? "success" : we < today ? "fail" : "pending";
        periods.push({ start: ws, end: we, status });
      } else {
        let scheduled = 0;
        let done = 0;
        let missedPast = false;
        for (let i = 0; i < 7; i++) {
          const d = addDays(ws, i);
          if (!isScheduledOn(h, d)) continue;
          scheduled++;
          if (isDone(idx, h.id, d)) done++;
          else if (d < today) missedPast = true;
        }
        if (scheduled === 0) continue;
        const status: PeriodStatus =
          done === scheduled ? "success" : missedPast ? "fail" : "pending";
        periods.push({ start: ws, end: we, status });
      }
    }
    return periods;
  }

  for (const d of eachDay(h.start_date, end)) {
    if (!isScheduledOn(h, d)) continue;
    const status: PeriodStatus = isDone(idx, h.id, d)
      ? "success"
      : d === today
        ? "pending"
        : "fail";
    periods.push({ start: d, end: d, status });
  }
  return periods;
}

export function computeHabitStreak(
  h: HabitModel,
  idx: CompletionIndex,
  today: ISODate,
): StreakResult {
  const statuses: DayStatus[] = habitPeriods(h, idx, today).map((p) =>
    p.status === "pending" ? "neutral" : p.status,
  );
  return streakFromStatuses(statuses);
}
