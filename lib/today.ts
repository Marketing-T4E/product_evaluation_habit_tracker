import { addDays, diffDays, startOfWeek, type ISODate } from "./dates";
import {
  completionsInWeek,
  flexibleWeekTarget,
  isActiveOn,
  isDone,
  isScheduledOn,
  type CompletionIndex,
  type HabitModel,
} from "./schedule";

/** Días hacia atrás que se pueden registrar desde "Hoy". */
export const MAX_DAYS_BACK = 7;

/** ¿Se puede registrar o desmarcar un cumplimiento en `date`? */
export function isLoggableDate(date: ISODate, today: ISODate): boolean {
  const diff = diffDays(today, date);
  return diff >= 0 && diff <= MAX_DAYS_BACK;
}

export function oldestLoggableDate(today: ISODate): ISODate {
  return addDays(today, -MAX_DAYS_BACK);
}

/** ¿Se puede marcar este hábito en esta fecha? */
export function canLogHabitOn(h: HabitModel, date: ISODate): boolean {
  return h.frequency.type === "weekly_flexible" ? isActiveOn(h, date) : isScheduledOn(h, date);
}

export interface ScheduledItem<H> {
  habit: H;
  done: boolean;
}

export interface FlexibleItem<H> {
  habit: H;
  done: boolean;
  weekCount: number;
  target: number;
  goalMet: boolean;
}

export interface DayView<H> {
  scheduled: ScheduledItem<H>[];
  flexible: FlexibleItem<H>[];
  completed: number;
  total: number;
}

/** Arma la vista de un día: hábitos programados y flexibles de esa semana. */
export function buildDayView<H extends HabitModel>(
  habits: ReadonlyArray<H>,
  idx: CompletionIndex,
  date: ISODate,
): DayView<H> {
  const scheduled: ScheduledItem<H>[] = [];
  const flexible: FlexibleItem<H>[] = [];
  const ws = startOfWeek(date);

  for (const h of habits) {
    if (h.frequency.type === "weekly_flexible") {
      if (!isActiveOn(h, date)) continue;
      const target = flexibleWeekTarget(h, ws);
      const weekCount = completionsInWeek(h, idx, ws);
      flexible.push({
        habit: h,
        done: isDone(idx, h.id, date),
        weekCount,
        target,
        goalMet: weekCount >= target,
      });
    } else if (isScheduledOn(h, date)) {
      scheduled.push({ habit: h, done: isDone(idx, h.id, date) });
    }
  }
  const completed = scheduled.filter((s) => s.done).length;
  return { scheduled, flexible, completed, total: scheduled.length };
}
