import type { Metadata } from "next";
import Link from "next/link";
import { getCompletions, getHabits, getProfile } from "@/lib/data";
import { addDays, parseISODate, startOfWeek, weekdayName } from "@/lib/dates";
import { streakUnit } from "@/lib/frequency";
import {
  bestAndWorstWeekday,
  dailyCompletion,
  habitRanking,
  habitTally,
  overallTally,
  RANGE_LABELS,
  rangeStart,
  rate,
  weekdayStats,
  weeklyTrend,
  type RangeKey,
} from "@/lib/metrics";
import { buildCompletionIndex } from "@/lib/schedule";
import { computeGlobalStreak, computeHabitStreak } from "@/lib/streaks";
import { Heatmap } from "@/components/heatmap";
import { WeekdayChart, WeeklyTrendChart } from "@/components/charts";

export const metadata: Metadata = { title: "Estadísticas" };

const RANGES: RangeKey[] = ["7d", "30d", "90d", "all"];

function pctText(p: number | null): string {
  return p === null ? "—" : `${Math.round(p * 100)}%`;
}

export default async function StatsPage() {
  const [profile, { all }, completions] = await Promise.all([getProfile(), getHabits(), getCompletions()]);
  const today = profile.today;

  if (all.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Estadísticas</h1>
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl" aria-hidden>
            📊
          </span>
          <h2 className="text-lg font-semibold">Todavía no hay estadísticas</h2>
          <p className="muted max-w-xs text-sm">Crea hábitos y regístralos para ver tu progreso aquí.</p>
          <Link href="/habits/new" className="btn-primary">
            Crear hábito
          </Link>
        </div>
      </div>
    );
  }

  const idx = buildCompletionIndex(completions);
  const byId = new Map(all.map((h) => [h.id, h]));

  const globalRates = RANGES.map((r) => ({
    key: r,
    pct: rate(overallTally(all, idx, rangeStart(r, today, all), today, today)),
  }));
  const globalStreak = computeGlobalStreak(all, idx, today, profile.streak_threshold);

  const perHabit = all.map((h) => ({
    habit: h,
    rates: RANGES.map((r) => rate(habitTally(h, idx, rangeStart(r, today, all), today, today))),
    streak: computeHabitStreak(h, idx, today),
  }));

  const heatFrom = startOfWeek(addDays(today, -364));
  const heatDays = dailyCompletion(all, idx, heatFrom, addDays(startOfWeek(today), 6));

  const trend = weeklyTrend(all, idx, today, 26).map((w) => {
    const { day, month } = parseISODate(w.weekStart);
    return { label: `${day}/${month}`, pct: w.pct === null ? null : Math.round(w.pct * 100) };
  });

  const wd = weekdayStats(all, idx, today);
  const { best, worst } = bestAndWorstWeekday(wd);
  const weekdayData = wd.map((s) => ({
    label: weekdayName(s.weekday, true),
    pct: s.pct === null ? null : Math.round(s.pct * 100),
    highlight:
      best && s.weekday === best.weekday
        ? ("best" as const)
        : worst && s.weekday === worst.weekday && worst.weekday !== best?.weekday
          ? ("worst" as const)
          : null,
  }));

  const ranking = habitRanking(all, idx, today);
  const top = ranking.slice(0, 3);
  const bottom = ranking.length > 3 ? ranking.slice(-3).reverse() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Estadísticas</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {globalRates.map((g) => (
          <div key={g.key} className="card">
            <p className="muted text-xs font-medium uppercase tracking-wide">{RANGE_LABELS[g.key]}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pctText(g.pct)}</p>
          </div>
        ))}
        <div className="card col-span-2 sm:col-span-1">
          <p className="muted text-xs font-medium uppercase tracking-wide">Racha global</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">🔥 {globalStreak.current}</p>
          <p className="muted text-xs">Récord: {globalStreak.best}</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Último año</h2>
        <Heatmap days={heatDays} today={today} />
        <p className="muted text-xs">
          % de hábitos programados cumplidos cada día (los flexibles semanales no se incluyen).
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Tendencia semanal</h2>
        <WeeklyTrendChart data={trend} />
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Por día de la semana</h2>
          {best && worst && (
            <p className="muted text-sm">
              Mejor: <strong className="text-emerald-600 dark:text-emerald-400">{weekdayName(best.weekday)}</strong> ·
              Peor: <strong className="text-rose-600 dark:text-rose-400">{weekdayName(worst.weekday)}</strong>
            </p>
          )}
        </div>
        <WeekdayChart data={weekdayData} />
      </section>

      {ranking.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="card space-y-2">
            <h2 className="font-semibold">🏆 Más cumplidos</h2>
            <RankingList entries={top} byId={byId} />
          </div>
          {bottom.length > 0 && (
            <div className="card space-y-2">
              <h2 className="font-semibold">🎯 Para mejorar</h2>
              <RankingList entries={bottom} byId={byId} />
            </div>
          )}
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Por hábito</h2>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="muted border-b border-zinc-200 text-left text-xs uppercase tracking-wide dark:border-zinc-800">
                <th className="py-2 pr-2 font-medium">Hábito</th>
                {RANGES.map((r) => (
                  <th key={r} className="px-2 py-2 text-right font-medium">
                    {RANGE_LABELS[r]}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right font-medium">Racha / récord</th>
              </tr>
            </thead>
            <tbody>
              {perHabit.map(({ habit, rates, streak }) => (
                <tr key={habit.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{habit.icon}</span>
                      <span className="truncate font-medium">{habit.name}</span>
                      {habit.archived_on && <span className="muted text-xs">(archivado)</span>}
                    </span>
                  </td>
                  {rates.map((p, i) => (
                    <td key={i} className="px-2 py-2 text-right tabular-nums">
                      {pctText(p)}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right tabular-nums">
                    {streak.current} / {streak.best}{" "}
                    <span className="muted text-xs">{streakUnit(habit.frequency, streak.best)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted text-xs">
          Solo se consideran los días en que cada hábito estaba programado y activo. Hoy cuenta solo si ya lo
          cumpliste.
        </p>
      </section>
    </div>
  );
}

function RankingList({
  entries,
  byId,
}: {
  entries: { habitId: string; pct: number | null; done: number; total: number }[];
  byId: Map<string, { name: string; icon: string; color: string }>;
}) {
  return (
    <ol className="space-y-2">
      {entries.map((e) => {
        const h = byId.get(e.habitId);
        if (!h) return null;
        const pct = Math.round((e.pct ?? 0) * 100);
        return (
          <li key={e.habitId} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden>{h.icon}</span>
                <span className="truncate">{h.name}</span>
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: h.color }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
