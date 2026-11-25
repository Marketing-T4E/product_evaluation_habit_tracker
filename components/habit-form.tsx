"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FREQUENCY_LABELS, FREQUENCY_TYPES, type Frequency, type FrequencyType } from "@/lib/frequency";
import { HABIT_COLORS } from "@/lib/validation";
import { weekdayName } from "@/lib/dates";
import { Alert, SubmitButton } from "./ui";

const EMOJIS = ["✅", "💧", "🏃", "🏋️", "🧘", "📚", "✍️", "🥗", "😴", "💊", "🧹", "💰", "🎸", "🌱", "🚭", "📞", "🦷", "🚶"];

export interface HabitFormValues {
  name: string;
  description: string;
  color: string;
  icon: string;
  start_date: string;
  frequency: Frequency;
}

export function HabitForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: HabitFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [type, setType] = useState<FrequencyType>(initial.frequency.type);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const f = initial.frequency;

  const initialDays = f.type === "weekly" ? f.config.days : [1];
  const initialBiweekly = f.type === "biweekly" ? f.config.day : 1;
  const initialMonthly = f.type === "monthly" ? f.config.day : 1;
  const initialTimes = f.type === "weekly_flexible" ? f.config.times : 3;
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}

      <div className="card space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={initial.name}
            maxLength={80}
            required
            placeholder="Ej. Leer 20 minutos"
          />
          {err.name && <p className="field-error">{err.name}</p>}
        </div>
        <div>
          <label htmlFor="description" className="label">
            Descripción <span className="muted font-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            className="input min-h-20"
            defaultValue={initial.description}
            maxLength={500}
          />
          {err.description && <p className="field-error">{err.description}</p>}
        </div>
      </div>

      <div className="card space-y-4">
        <fieldset>
          <legend className="label">Ícono</legend>
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ backgroundColor: `${color}22` }}
              aria-hidden
            >
              {icon || "❔"}
            </span>
            <input
              name="icon"
              className="input w-24 text-center text-xl"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={16}
              aria-label="Emoji del hábito"
              required
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`h-9 w-9 rounded-lg text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  icon === e ? "bg-zinc-100 ring-2 ring-emerald-500 dark:bg-zinc-800" : ""
                }`}
                aria-label={`Usar ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
          {err.icon && <p className="field-error">{err.icon}</p>}
        </fieldset>

        <fieldset>
          <legend className="label">Color</legend>
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full transition ${
                  color === c ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-zinc-900" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
          {err.color && <p className="field-error">{err.color}</p>}
        </fieldset>
      </div>

      <div className="card space-y-4">
        <div>
          <label htmlFor="frequency_type" className="label">
            Frecuencia
          </label>
          <select
            id="frequency_type"
            name="frequency_type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as FrequencyType)}
          >
            {FREQUENCY_TYPES.map((t) => (
              <option key={t} value={t}>
                {FREQUENCY_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {type === "every_other_day" && (
          <p className="muted text-sm">Se repite cada 2 días contando desde la fecha de inicio.</p>
        )}

        {type === "weekly" && (
          <fieldset>
            <legend className="label">Días de la semana</legend>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <label key={d} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="weekly_days"
                    value={d}
                    defaultChecked={initialDays.includes(d)}
                    className="peer sr-only"
                  />
                  <span className="flex h-10 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium transition peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 dark:border-zinc-700">
                    {weekdayName(d, true)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {type === "biweekly" && (
          <div>
            <label htmlFor="biweekly_day" className="label">
              Día de la semana
            </label>
            <select id="biweekly_day" name="biweekly_day" className="input" defaultValue={initialBiweekly}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </select>
            <p className="muted mt-1 text-xs">
              Cada dos semanas, empezando el primer día elegido a partir de la fecha de inicio.
            </p>
          </div>
        )}

        {type === "monthly" && (
          <div>
            <label htmlFor="monthly_day" className="label">
              Día del mes
            </label>
            <select id="monthly_day" name="monthly_day" className="input" defaultValue={initialMonthly}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <p className="muted mt-1 text-xs">Si el mes no tiene ese día, se usa el último día del mes.</p>
          </div>
        )}

        {type === "weekly_flexible" && (
          <div>
            <label htmlFor="flexible_times" className="label">
              Veces por semana
            </label>
            <select id="flexible_times" name="flexible_times" className="input" defaultValue={initialTimes}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} de 7 días
                </option>
              ))}
            </select>
            <p className="muted mt-1 text-xs">Sin día fijo. La semana va de lunes a domingo.</p>
          </div>
        )}
        {err.frequency && <p className="field-error">Revisa la configuración de la frecuencia.</p>}

        <div>
          <label htmlFor="start_date" className="label">
            Fecha de inicio
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            className="input"
            defaultValue={initial.start_date}
            required
          />
          {err.start_date && <p className="field-error">{err.start_date}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/habits" className="btn-secondary">
          Cancelar
        </Link>
        <SubmitButton className="btn-primary" pendingText="Guardando…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
