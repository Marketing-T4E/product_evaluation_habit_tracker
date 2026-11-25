import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site-url";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Maneja los enlaces de los emails de Supabase:
 * - Confirmación de registro y restablecimiento de contraseña.
 * - Soporta el flujo PKCE (`?code=`) y el de token (`?token_hash=&type=`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const defaultNext = type === "recovery" ? "/reset-password" : "/";
  const next = safeNextPath(searchParams.get("next"), defaultNext);

  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) errorMessage = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) errorMessage = error.message;
  } else {
    errorMessage = searchParams.get("error_description") ?? "Enlace inválido";
  }

  if (!errorMessage) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "error",
    "El enlace no es válido o expiró. Si ya confirmaste tu cuenta, inicia sesión; si no, solicita uno nuevo.",
  );
  return NextResponse.redirect(loginUrl);
}
