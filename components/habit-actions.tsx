"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveHabit, deleteHabit, restoreHabit } from "@/app/actions/habits";
import { Spinner } from "./ui";

export function HabitActions({
  habitId,
  habitName,
  archived,
  redirectAfterDelete,
}: {
  habitId: string;
  habitName: string;
  archived: boolean;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>, after?: string) {
    setError(null);
    startTransition(async () => {
      const r = await fn(habitId);
      if (!r.ok) {
        setError(r.error ?? "Ocurrió un error.");
        return;
      }
      setConfirming(false);
      if (after) router.push(after);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
        <p>
          ¿Eliminar <strong>{habitName}</strong> y todo su historial? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-danger py-2"
            disabled={pending}
            onClick={() => run(deleteHabit, redirectAfterDelete)}
          >
            {pending && <Spinner />} Sí, eliminar
          </button>
          <button type="button" className="btn-secondary py-2" disabled={pending} onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {archived ? (
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={pending} onClick={() => run(restoreHabit)}>
          {pending && <Spinner />} Restaurar
        </button>
      ) : (
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={pending} onClick={() => run(archiveHabit)}>
          {pending && <Spinner />} Archivar
        </button>
      )}
      <button
        type="button"
        className="btn-ghost px-3 py-1.5 text-rose-600 dark:text-rose-400"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        Eliminar
      </button>
      {error && <p className="field-error w-full">{error}</p>}
    </div>
  );
}
