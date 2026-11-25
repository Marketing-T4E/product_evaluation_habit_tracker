"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeNextPath } from "@/lib/site-url";
import {
  emailSchema,
  fieldErrors,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Ya existe una cuenta con ese email.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  if (m.includes("password") && m.includes("weak"))
    return "La contraseña es demasiado débil. Usa una más larga o más compleja.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "La nueva contraseña debe ser distinta de la anterior.";
  return "Ocurrió un error. Inténtalo de nuevo.";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { name, email, password, timezone } = parsed.data;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, timezone },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
    },
  });
  if (error) return { error: translateAuthError(error.message) };

  // Si la confirmación de email está desactivada, ya hay sesión.
  if (data.session) redirect("/");

  return {
    message:
      "¡Listo! Te enviamos un email para confirmar tu cuenta. Abre el enlace y luego inicia sesión.",
  };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message) };

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error && !error.message.toLowerCase().includes("not found")) {
    return { error: translateAuthError(error.message) };
  }
  // Mensaje genérico: no revelamos si el email existe.
  return {
    message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "El enlace expiró. Solicita uno nuevo." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: translateAuthError(error.message) };

  redirect("/?password=updated");
}
