import type { Metadata } from "next";
import Link from "next/link";
import { getCompletions, getHabits, getProfile } from "@/lib/data";
import { formatShortDate } from "@/lib/dates";
import { describeFrequency, streakUnit } from "@/lib/frequency";
import { buildCompletionIndex } from "@/lib/schedule";
import { computeHabitStreak } from "@/lib/streaks";
import type { Habit } from "@/lib/types";
import { HabitActions } from "@/components/habit-actions";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Hábitos" };

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const [profile, { active, archived }, completions] = await Promise.all([
    getProfile(),
    getHabits(),
    getCompletions(),
  ]);
  const idx = buildCompletionIndex(completions);

  const card = (h: Habit, isArchived: boolean) => {
    const streak = computeHabitStreak(h, idx, profile.today);
    return (
      <li key={h.id} className="card space-y-3" style={{ borderLeft: `4px solid ${h.color}` }}>
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: `${h.color}22` }}
            aria-hidden
          >
            {h.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold">{h.name}</h3>
              {!isArchived && (
                <Link href={`/habits/${h.id}/edit`} className="btn-ghost -mr-2 -mt-1 px-2 py-1 text-sm">
                  Editar
                </Link>
              )}
            </div>
            {h.description && <p className="muted mt-0.5 line-clamp-2 text-sm">{h.description}</p>}
            <p className="muted mt-1 text-xs">
              {describeFrequency(h.frequency)} · desde {formatShortDate(h.start_date)}
              {h.archived_on && ` · archivado el ${formatShortDate(h.archived_on)}`}
            </p>
            <p className="mt-1 text-sm">
              🔥 {streak.current} {streakUnit(h.frequency, streak.current)}{" "}
              <span className="muted">· récord {streak.best}</span>
            </p>
          </div>
        </div>
        <HabitActions habitId={h.id} habitName={h.name} archived={isArchived} />
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Mis hábitos</h1>
        <Link href="/habits/new" className="btn-primary">
          + Nuevo
        </Link>
      </div>

      {params.created && <Alert kind="success">Hábito creado.</Alert>}
      {params.updated && <Alert kind="success">Cambios guardados.</Alert>}

      {active.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl" aria-hidden>
            📝
          </span>
          <h2 className="text-lg font-semibold">Aún no tienes hábitos activos</h2>
          <p className="muted max-w-xs text-sm">Define qué quieres hacer y con qué frecuencia.</p>
          <Link href="/habits/new" className="btn-primary">
            Crear mi primer hábito
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">{active.map((h) => card(h, false))}</ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Archivados ({archived.length})
          </h2>
          <ul className="space-y-3 opacity-90">{archived.map((h) => card(h, true))}</ul>
        </section>
      )}
    </div>
  );
}
