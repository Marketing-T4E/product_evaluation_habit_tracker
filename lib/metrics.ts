import { addDays, eachDay, endOfWeek, isoWeekday, maxDate, minDate, startOfWeek, type ISODate } from "./dates";
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

export interface Tally {
  done: number;
  total: number;
}

export function rate(t: Tally): number | null {
  return t.total === 0 ? null : t.done / t.total;
}

function addTally(a: Tally, b: Tally): Tally {
  return { done: a.done + b.done, total: a.total + b.total };
}

/**
 * Cumplimiento de un hábito entre `from` y `to` (incluidos), considerando
 * solo los días en que estaba programado y activo.
 *
 * - Hoy solo cuenta si ya se cumplió (no penaliza un día que no terminó).
 * - Flexibles: cada semana que toca el rango aporta `meta` oportunidades y
 *   min(cumplimientos, meta) logros. La semana en curso solo aporta lo ya
 *   cumplido hasta que termine o alcance la meta.
 */
export function habitTally(
  h: HabitModel,
  idx: CompletionIndex,
  from: ISODate,
  to: ISODate,
  today: ISODate,
): Tally {
  const last = lastActiveDay(h);
  let end = minDate(to, today);
  if (last) end = minDate(end, last);
  const start = maxDate(from, h.start_date);
  if (start > end) return { done: 0, total: 0 };

  if (h.frequency.type === "weekly_flexible") {
    let done = 0;
    let total = 0;
    for (let ws = startOfWeek(start); ws <= end; ws = addDays(ws, 7)) {
      const target = flexibleWeekTarget(h, ws);
      if (target === 0) continue;
      const achieved = Math.min(completionsInWeek(h, idx, ws), target);
      const ended = endOfWeek(ws) < today;
      done += achieved;
      total += ended || achieved >= target ? target : achieved;
    }
    return { done, total };
  }

  let done = 0;
  let total = 0;
  for (const d of eachDay(start, end)) {
    if (!isScheduledOn(h, d)) continue;
    if (isDone(idx, h.id, d)) {
      done++;
      total++;
    } else if (d < today) {
      total++;
    }
  }
  return { done, total };
}

export function overallTally(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  from: ISODate,
  to: ISODate,
  today: ISODate,
): Tally {
  return habits.reduce<Tally>(
    (acc, h) => addTally(acc, habitTally(h, idx, from, to, today)),
    { done: 0, total: 0 },
  );
}

export type RangeKey = "7d" | "30d" | "90d" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  all: "Todo",
};

export function rangeStart(
  key: RangeKey,
  today: ISODate,
  habits: ReadonlyArray<HabitModel>,
): ISODate {
  switch (key) {
    case "7d":
      return addDays(today, -6);
    case "30d":
      return addDays(today, -29);
    case "90d":
      return addDays(today, -89);
    case "all":
      return earliestStart(habits) ?? today;
  }
}

export interface HeatmapDay {
  date: ISODate;
  done: number;
  total: number;
  /** 0-1, o null si ese día no había hábitos programados. */
  pct: number | null;
}

/** % de cumplimiento diario (hábitos no flexibles) entre `from` y `to`. */
export function dailyCompletion(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  from: ISODate,
  to: ISODate,
): HeatmapDay[] {
  const fixed = habits.filter((h) => h.frequency.type !== "weekly_flexible");
  return eachDay(from, to).map((date) => {
    let done = 0;
    let total = 0;
    for (const h of fixed) {
      if (!isScheduledOn(h, date)) continue;
      total++;
      if (isDone(idx, h.id, date)) done++;
    }
    return { date, done, total, pct: total === 0 ? null : done / total };
  });
}

export interface WeekPoint {
  weekStart: ISODate;
  pct: number | null;
  done: number;
  total: number;
}

/** Tendencia semanal (lunes a domingo) de las últimas `weeks` semanas. */
export function weeklyTrend(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  today: ISODate,
  weeks: number,
): WeekPoint[] {
  const current = startOfWeek(today);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(current, -7 * i);
    const t = overallTally(habits, idx, ws, endOfWeek(ws), today);
    points.push({ weekStart: ws, pct: rate(t), ...t });
  }
  return points;
}

export interface WeekdayStat extends Tally {
  weekday: number; // 1 = lunes … 7 = domingo
  pct: number | null;
}

/** Cumplimiento por día de la semana (hábitos no flexibles, todo el historial). */
export function weekdayStats(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  today: ISODate,
): WeekdayStat[] {
  const stats: WeekdayStat[] = Array.from({ length: 7 }, (_, i) => ({
    weekday: i + 1,
    done: 0,
    total: 0,
    pct: null,
  }));
  const start = earliestStart(habits);
  if (!start || start > today) return stats;
  const fixed = habits.filter((h) => h.frequency.type !== "weekly_flexible");
  for (const d of eachDay(start, today)) {
    const s = stats[isoWeekday(d) - 1];
    for (const h of fixed) {
      if (!isScheduledOn(h, d)) continue;
      if (isDone(idx, h.id, d)) {
        s.done++;
        s.total++;
      } else if (d < today) {
        s.total++;
      }
    }
  }
  for (const s of stats) s.pct = rate(s);
  return stats;
}

export function bestAndWorstWeekday(stats: ReadonlyArray<WeekdayStat>): {
  best: WeekdayStat | null;
  worst: WeekdayStat | null;
} {
  const withData = stats.filter((s) => s.pct !== null);
  if (withData.length === 0) return { best: null, worst: null };
  let best = withData[0];
  let worst = withData[0];
  for (const s of withData) {
    if ((s.pct ?? 0) > (best.pct ?? 0)) best = s;
    if ((s.pct ?? 0) < (worst.pct ?? 0)) worst = s;
  }
  return { best, worst };
}

export interface RankingEntry extends Tally {
  habitId: string;
  pct: number | null;
}

/** Hábitos ordenados de mayor a menor cumplimiento (todo el historial). */
export function habitRanking(
  habits: ReadonlyArray<HabitModel>,
  idx: CompletionIndex,
  today: ISODate,
): RankingEntry[] {
  return habits
    .map((h) => {
      const t = habitTally(h, idx, h.start_date, today, today);
      return { habitId: h.id, ...t, pct: rate(t) };
    })
    .filter((e) => e.pct !== null)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.total - a.total);
}
