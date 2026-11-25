import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { safeNextPath } from "@/lib/site-url";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={safeNextPath(next)}
      initialError={typeof error === "string" ? error.slice(0, 300) : undefined}
    />
  );
}
