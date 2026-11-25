import type { Metadata } from "next";
import { HabitForm } from "@/components/habit-form";
import { createHabit } from "@/app/actions/habits";
import { getProfile } from "@/lib/data";
import { HABIT_COLORS } from "@/lib/validation";

export const metadata: Metadata = { title: "Nuevo hábito" };

export default async function NewHabitPage() {
  const profile = await getProfile();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nuevo hábito</h1>
      <HabitForm
        action={createHabit}
        submitLabel="Crear hábito"
        initial={{
          name: "",
          description: "",
          color: HABIT_COLORS[0],
          icon: "✅",
          start_date: profile.today,
          frequency: { type: "daily", config: {} },
        }}
      />
    </div>
  );
}
