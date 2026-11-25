import Link from "next/link";
import { Nav } from "@/components/nav";
import { signOut } from "@/app/actions/auth";
import { getProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">✓</span>
            <span>Hábitos</span>
          </Link>
          <Nav />
          <div className="flex items-center gap-2">
            <span className="muted hidden max-w-[10rem] truncate text-sm md:inline">{profile.name}</span>
            <form action={signOut}>
              <button type="submit" className="btn-ghost px-3 py-2">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}
