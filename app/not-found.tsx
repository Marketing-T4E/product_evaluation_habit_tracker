import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card flex max-w-sm flex-col items-center gap-3 py-10 text-center">
        <span className="text-4xl" aria-hidden>
          🔎
        </span>
        <h1 className="text-lg font-semibold">No encontramos esta página</h1>
        <p className="muted text-sm">Puede que el enlace esté mal o que el elemento ya no exista.</p>
        <Link href="/" className="btn-primary">
          Ir a Hoy
        </Link>
      </div>
    </main>
  );
}
