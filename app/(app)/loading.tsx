export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="mx-auto h-7 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
