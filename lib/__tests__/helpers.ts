import { buildCompletionIndex, type HabitModel } from "../schedule";
import type { Frequency } from "../frequency";
import { eachDay } from "../dates";

let counter = 0;

export function habit(
  frequency: Frequency,
  start_date: string,
  archived_on: string | null = null,
  id?: string,
): HabitModel {
  counter++;
  return { id: id ?? `h${counter}`, frequency, start_date, archived_on };
}

export const daily = (): Frequency => ({ type: "daily", config: {} });
export const everyOther = (): Frequency => ({ type: "every_other_day", config: {} });
export const weekly = (days: number[]): Frequency => ({ type: "weekly", config: { days } });
export const biweekly = (day: number): Frequency => ({ type: "biweekly", config: { day } });
export const monthly = (day: number): Frequency => ({ type: "monthly", config: { day } });
export const flexible = (times: number): Frequency => ({
  type: "weekly_flexible",
  config: { times },
});

export function index(entries: Record<string, string[]>) {
  const rows = Object.entries(entries).flatMap(([habit_id, dates]) =>
    dates.map((date) => ({ habit_id, date })),
  );
  return buildCompletionIndex(rows);
}

export function range(from: string, to: string): string[] {
  return eachDay(from, to);
}
