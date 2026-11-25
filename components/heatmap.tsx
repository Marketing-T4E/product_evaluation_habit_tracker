import { formatShortDate, parseISODate } from "@/lib/dates";
import type { HeatmapDay } from "@/lib/metrics";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function cellClass(day: HeatmapDay | null): string {
  if (!day) return "bg-transparent";
  if (day.pct === null) return "bg-zinc-100 dark:bg-zinc-800/60";
  if (day.pct === 0) return "bg-zinc-200 dark:bg-zinc-700";
  if (day.pct < 0.34) return "bg-emerald-200 dark:bg-emerald-900";
  if (day.pct < 0.67) return "bg-emerald-400 dark:bg-emerald-700";
  if (day.pct < 1) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-700 dark:bg-emerald-300";
}

/**
 * Heatmap estilo GitHub. `days` debe empezar un lunes; las columnas son
 * semanas (lunes arriba, domingo abajo). Los días futuros se dejan vacíos.
 */
export function Heatmap({ days, today }: { days: HeatmapDay[]; today: string }) {
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(Array.from({ length: 7 }, (_, j) => {
      const d = days[i + j];
      return d && d.date <= today ? d : null;
    }));
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-7 text-[10px] text-zinc-500">
          {weeks.map((w, i) => {
            const first = w.find(Boolean);
            const { month, day } = first ? parseISODate(first.date) : { month: 0, day: 99 };
            return (
              <span key={i} className="w-3 shrink-0 overflow-visible whitespace-nowrap">
                {first && day <= 7 ? MONTHS[month - 1] : ""}
              </span>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex w-6 shrink-0 flex-col gap-[3px] text-[10px] leading-3 text-zinc-500">
            {["L", "", "X", "", "V", "", "D"].map((l, i) => (
              <span key={i} className="h-3">
                {l}
              </span>
            ))}
          </div>
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d, j) => (
                <span
                  key={j}
                  className={`block h-3 w-3 rounded-[3px] ${cellClass(d)}`}
                  title={
                    d
                      ? `${formatShortDate(d.date)}: ${
                          d.pct === null ? "sin hábitos programados" : `${d.done}/${d.total} (${Math.round(d.pct * 100)}%)`
                        }`
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 self-end text-[10px] text-zinc-500">
          Menos
          {[
            "bg-zinc-200 dark:bg-zinc-700",
            "bg-emerald-200 dark:bg-emerald-900",
            "bg-emerald-400 dark:bg-emerald-700",
            "bg-emerald-500 dark:bg-emerald-500",
            "bg-emerald-700 dark:bg-emerald-300",
          ].map((c) => (
            <span key={c} className={`h-3 w-3 rounded-[3px] ${c}`} />
          ))}
          Más
        </div>
      </div>
    </div>
  );
}
