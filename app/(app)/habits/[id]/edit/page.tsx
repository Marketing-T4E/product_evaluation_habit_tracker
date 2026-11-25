import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { HabitForm } from "@/components/habit-form";
import { HabitActions } from "@/components/habit-actions";
import { updateHabit } from "@/app/actions/habits";
import { getHabit } from "@/lib/data";

export const metadata: Metadata = { title: "Editar hábito" };

export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const habit = await getHabit(id);
  if (!habit) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Editar hábito</h1>
      <HabitForm
        action={updateHabit.bind(null, habit.id)}
        submitLabel="Guardar cambios"
        initial={{
          name: habit.name,
          description: habit.description ?? "",
          color: habit.color,
          icon: habit.icon,
          start_date: habit.start_date,
          frequency: habit.frequency,
        }}
      />
      <section className="card space-y-2">
        <h2 className="font-semibold">Zona de gestión</h2>
        <p className="muted text-sm">
          Archivar conserva el historial y lo quita de &quot;Hoy&quot;. Eliminar borra el hábito y todos sus registros.
        </p>
        <HabitActions
          habitId={habit.id}
          habitName={habit.name}
          archived={habit.archived_on !== null}
          redirectAfterDelete="/habits"
        />
      </section>
    </div>
  );
}
