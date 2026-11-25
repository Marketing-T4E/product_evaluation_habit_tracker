import Link from "next/link";
import { getCompletions, getHabits, getProfile } from "@/lib/data";
import { addDays, formatLongDate, isISODate } from "@/lib/dates";
import { describeFrequency } from "@/lib/frequency";
import { buildCompletionIndex } from "@/lib/schedule";
import { computeGlobalStreak } from "@/lib/streaks";
import { buildDayView, isLoggableDate, oldestLoggableDate } from "@/lib/today";
import { TodayList, type TodayItem } from "@/components/today-list";
import { Alert } from "@/components/ui";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; password?: string }>;
}) {
  const params = await searchParams;
  const [profile, { all, active }, completions] = await Promise.all([
    getProfile(),
    getHabits(),
    getCompletions(),
  ]);
  const today = profile.today;
  const date =
    params.date && isISODate(params.date) && isLoggableDate(params.date, today) ? params.date : today;
  const isToday = date === today;

  const idx = buildCompletionIndex(completions);
  // Incluye archivados para que el día consultado respete su historial.
  const view = buildDayView(all, idx, date);
  const streak = computeGlobalStreak(all, idx, today, profile.streak_threshold);

  const toItem = (h: (typeof all)[number], done: boolean): TodayItem => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    color: h.color,
    description: h.description,
    frequencyLabel: describeFrequency(h.frequency),
    done,
  });

  const scheduled = view.scheduled.map((s) => toItem(s.habit, s.done));
  const flexible = view.flexible.map((f) => ({
    ...toItem(f.habit, f.done),
    weekCount: f.weekCount,
    target: f.target,
  }));

  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canPrev = isLoggableDate(prev, today);
  const canNext = isLoggableDate(next, today);
  const hrefFor = (d: string) => (d === today ? "/" : `/?date=${d}`);

  return (
    <div className="space-y-5">
      {params.password === "updated" && <Alert kind="success">Tu contraseña se actualizó.</Alert>}

      <section className="flex items-center justify-between gap-2">
        {canPrev ? (
          <Link href={hrefFor(prev)} className="btn-secondary h-10 w-10 p-0" aria-label="Día anterior">
            ‹
          </Link>
        ) : (
          <span className="btn-secondary pointer-events-none h-10 w-10 p-0 opacity-40" aria-hidden>
            ‹
          </span>
        )}
        <div className="text-center">
          <h1 className="text-xl font-bold">{isToday ? "Hoy" : date === addDays(today, -1) ? "Ayer" : "Registro pasado"}</h1>
          <p className="muted text-sm first-letter:uppercase">{formatLongDate(date)}</p>
        </div>
        {canNext ? (
          <Link href={hrefFor(next)} className="btn-secondary h-10 w-10 p-0" aria-label="Día siguiente">
            ›
          </Link>
        ) : (
          <span className="btn-secondary pointer-events-none h-10 w-10 p-0 opacity-40" aria-hidden>
            ›
          </span>
        )}
      </section>

      {!isToday && (
        <Alert kind="info">
          Estás registrando un día anterior. Puedes editar hasta el {formatLongDate(oldestLoggableDate(today))}.{" "}
          <Link href="/" className="font-semibold underline">
            Volver a hoy
          </Link>
        </Alert>
      )}

      {active.length === 0 && view.total === 0 && view.flexible.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <span className="text-4xl" aria-hidden>
            🌱
          </span>
          <h2 className="text-lg font-semibold">Aún no tienes hábitos</h2>
          <p className="muted max-w-xs text-sm">Crea tu primer hábito y empieza a construir tu racha.</p>
          <Link href="/habits/new" className="btn-primary">
            Crear hábito
          </Link>
        </div>
      ) : (
        <TodayList
          key={date}
          date={date}
          scheduled={scheduled}
          flexible={flexible}
          streak={streak}
        />
      )}
    </div>
  );
}
