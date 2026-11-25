"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toggleCompletion } from "@/app/actions/habits";
import { Alert } from "./ui";

export interface TodayItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  frequencyLabel: string;
  done: boolean;
}

export interface FlexibleTodayItem extends TodayItem {
  weekCount: number;
  target: number;
}

type DoneMap = Record<string, boolean>;

export function TodayList({
  date,
  scheduled,
  flexible,
  streak,
}: {
  date: string;
  scheduled: TodayItem[];
  flexible: FlexibleTodayItem[];
  streak: { current: number; best: number };
}) {
  const serverDone: DoneMap = Object.fromEntries(
    [...scheduled, ...flexible].map((i) => [i.id, i.done]),
  );
  const [optimisticDone, setOptimisticDone] = useOptimistic(
    serverDone,
    (state: DoneMap, update: { id: string; done: boolean }) => ({ ...state, [update.id]: update.done }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    const done = !optimisticDone[id];
    setError(null);
    startTransition(async () => {
      setOptimisticDone({ id, done });
      const result = await toggleCompletion({ habitId: id, date, done });
      if (!result.ok) setError(result.error ?? "No se pudo guardar. Inténtalo de nuevo.");
    });
  }

  const completed = scheduled.filter((s) => optimisticDone[s.id]).length;
  const total = scheduled.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="muted text-xs font-medium uppercase tracking-wide">Progreso del día</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {completed} <span className="muted text-base font-medium">de {total}</span>
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progreso del día"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="card">
          <p className="muted text-xs font-medium uppercase tracking-wide">Racha global</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            🔥 {streak.current} <span className="muted text-base font-medium">{streak.current === 1 ? "día" : "días"}</span>
          </p>
          <p className="muted mt-1 text-xs">Récord: {streak.best}</p>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      <section aria-labelledby="scheduled-title" className="space-y-2">
        <h2 id="scheduled-title" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Programados
        </h2>
        {scheduled.length === 0 ? (
          <p className="card muted text-sm">No hay hábitos programados para este día. ¡Disfruta el descanso!</p>
        ) : (
          <ul className="space-y-2">
            {scheduled.map((item) => (
              <HabitRow key={item.id} item={item} done={!!optimisticDone[item.id]} onToggle={() => toggle(item.id)} />
            ))}
          </ul>
        )}
      </section>

      {flexible.length > 0 && (
        <section aria-labelledby="flex-title" className="space-y-2">
          <h2 id="flex-title" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Esta semana
          </h2>
          <ul className="space-y-2">
            {flexible.map((item) => {
              const done = !!optimisticDone[item.id];
              const count = item.weekCount + (done === item.done ? 0 : done ? 1 : -1);
              const goalMet = count >= item.target;
              return (
                <HabitRow
                  key={item.id}
                  item={item}
                  done={done}
                  onToggle={() => toggle(item.id)}
                  extra={
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        goalMet
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {goalMet ? "✓ " : ""}
                      {count}/{item.target} esta semana
                    </span>
                  }
                />
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex justify-center">
        <Link href="/habits/new" className="btn-ghost">
          + Nuevo hábito
        </Link>
      </div>
    </div>
  );
}

function HabitRow({
  item,
  done,
  onToggle,
  extra,
}: {
  item: TodayItem;
  done: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) {
  const inputId = `habit-${item.id}`;
  return (
    <li>
      <label
        htmlFor={inputId}
        className={`card flex cursor-pointer items-center gap-3 transition hover:border-zinc-300 dark:hover:border-zinc-700 ${
          done ? "opacity-80" : ""
        }`}
        style={{ borderLeft: `4px solid ${item.color}` }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${item.color}22` }}
          aria-hidden
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${done ? "text-zinc-500 line-through dark:text-zinc-400" : ""}`}>
            {item.name}
          </span>
          <span className="muted flex flex-wrap items-center gap-2 text-xs">
            <span>{item.frequencyLabel}</span>
            {extra}
          </span>
        </span>
        <input
          id={inputId}
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="peer sr-only"
          aria-label={`Marcar ${item.name} como cumplido`}
        />
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-white transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 ${
            done ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-600"
          }`}
        >
          {done && (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </label>
    </li>
  );
}
