"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center" role="alert">
      <span className="text-4xl" aria-hidden>
        ⚠️
      </span>
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="muted max-w-sm text-sm">
        No pudimos cargar esta pantalla. Revisa tu conexión e inténtalo de nuevo.
      </p>
      <button type="button" className="btn-primary" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
