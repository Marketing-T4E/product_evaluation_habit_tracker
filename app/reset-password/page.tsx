import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/data";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage() {
  // Requiere la sesión creada por el enlace de recuperación (/auth/callback).
  await requireUser();
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
