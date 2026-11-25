import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas accesibles sin sesión. */
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth"];
/** Rutas solo para usuarios SIN sesión (si hay sesión, se redirige a "/"). */
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

function matches(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas privadas.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse(
      "Configuración incompleta: faltan las variables de entorno de Supabase (ver SETUP.md).",
      { status: 500 },
    );
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // No ejecutar código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    if (params) for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
    const res = NextResponse.redirect(target);
    // Conserva las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !matches(pathname, PUBLIC_PATHS)) {
    const next = pathname === "/" ? undefined : `${pathname}${search}`;
    return redirectTo("/login", next ? { next } : undefined);
  }

  if (user && matches(pathname, GUEST_ONLY)) {
    return redirectTo("/");
  }

  return response;
}
