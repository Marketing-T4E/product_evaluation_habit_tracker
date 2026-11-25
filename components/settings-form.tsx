"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { THRESHOLD_OPTIONS } from "@/lib/validation";
import { Alert, SubmitButton } from "./ui";

export function SettingsForm({
  name,
  timezone,
  threshold,
  zones,
}: {
  name: string;
  timezone: string;
  threshold: number;
  zones: string[];
}) {
  const [state, action] = useActionState(updateProfile, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="card space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert kind="success">{state.message}</Alert>}
      <div>
        <label htmlFor="name" className="label">
          Nombre
        </label>
        <input id="name" name="name" className="input" defaultValue={name} maxLength={80} required />
        {err.name && <p className="field-error">{err.name}</p>}
      </div>
      <div>
        <label htmlFor="timezone" className="label">
          Zona horaria
        </label>
        <select id="timezone" name="timezone" className="input" defaultValue={timezone}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <p className="muted mt-1 text-xs">Define cuándo empieza y termina tu día.</p>
        {err.timezone && <p className="field-error">{err.timezone}</p>}
      </div>
      <div>
        <label htmlFor="streak_threshold" className="label">
          Umbral de la racha global
        </label>
        <select id="streak_threshold" name="streak_threshold" className="input" defaultValue={threshold}>
          {THRESHOLD_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}% de los hábitos del día
            </option>
          ))}
        </select>
        <p className="muted mt-1 text-xs">Un día suma a tu racha si cumples al menos este porcentaje.</p>
        {err.streak_threshold && <p className="field-error">{err.streak_threshold}</p>}
      </div>
      <SubmitButton className="btn-primary" pendingText="Guardando…">
        Guardar ajustes
      </SubmitButton>
    </form>
  );
}
