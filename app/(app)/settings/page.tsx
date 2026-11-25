import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/data";
import { SettingsForm } from "@/components/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Ajustes" };

function timeZones(current: string): string[] {
  let list: string[] = [];
  try {
    list = Intl.supportedValuesOf("timeZone");
  } catch {}
  if (!list.includes("UTC")) list = ["UTC", ...list];
  if (!list.includes(current)) list = [current, ...list];
  return list;
}

export default async function SettingsPage() {
  const [{ user }, profile] = await Promise.all([requireUser(), getProfile()]);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Ajustes</h1>
      <SettingsForm name={profile.name} timezone={profile.timezone} threshold={profile.streak_threshold}
        zones={timeZones(profile.timezone)}
      />
      <section className="card space-y-3">
        <h2 className="font-semibold">Apariencia</h2>
        <ThemeToggle />
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">Cuenta</h2>
        <p className="muted text-sm">Sesión iniciada como {user.email}</p>
        <form action={signOut}>
          <button type="submit" className="btn-secondary">
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}
