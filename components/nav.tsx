"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Hoy", icon: "✅" },
  { href: "/habits", label: "Hábitos", icon: "📋" },
  { href: "/stats", label: "Estadísticas", icon: "📊" },
  { href: "/settings", label: "Ajustes", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegación: barra inferior en móvil, enlaces en la cabecera en escritorio. */
export function Nav() {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(pathname, l.href) ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive(pathname, l.href)
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <ul className="grid grid-cols-4">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(pathname, l.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  isActive(pathname, l.href)
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {l.icon}
                </span>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
