"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card flex max-w-sm flex-col items-center gap-3 py-10 text-center" role="alert">
        <span className="text-4xl" aria-hidden>
          ⚠️
        </span>
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="muted text-sm">Ocurrió un error inesperado. Inténtalo de nuevo en unos segundos.</p>
        <button type="button" className="btn-primary" onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
