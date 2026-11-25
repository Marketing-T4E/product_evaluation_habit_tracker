import { z } from "zod";

/**
 * Frecuencias soportadas. En la base de datos se guardan como
 * `frequency_type` (enum) + `frequency_config` (jsonb). Para añadir un tipo
 * nuevo: agregarlo al enum SQL, a este arreglo, a `frequencySchema` y a
 * `isScheduledOn` en `schedule.ts`.
 */
export const FREQUENCY_TYPES = [
  "daily",
  "every_other_day",
  "weekly",
  "biweekly",
  "monthly",
  "weekly_flexible",
] as const;

export type FrequencyType = (typeof FREQUENCY_TYPES)[number];

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: "Diario",
  every_other_day: "Día por medio",
  weekly: "Semanal (días fijos)",
  biweekly: "Quincenal",
  monthly: "Mensual",
  weekly_flexible: "Flexible semanal",
};

const isoWeekdaySchema = z.number().int().min(1).max(7);

export const frequencySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily"), config: z.object({}) }),
  z.object({ type: z.literal("every_other_day"), config: z.object({}) }),
  z.object({
    type: z.literal("weekly"),
    config: z.object({
      days: z
        .array(isoWeekdaySchema)
        .min(1, "Elige al menos un día")
        .transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
    }),
  }),
  z.object({
    type: z.literal("biweekly"),
    config: z.object({ day: isoWeekdaySchema }),
  }),
  z.object({
    type: z.literal("monthly"),
    config: z.object({ day: z.number().int().min(1).max(31) }),
  }),
  z.object({
    type: z.literal("weekly_flexible"),
    config: z.object({ times: z.number().int().min(1).max(7) }),
  }),
]);

export type Frequency = z.infer<typeof frequencySchema>;

/** Convierte las columnas de la BD en una `Frequency` validada (o null si es inválida). */
export function parseFrequency(type: unknown, config: unknown): Frequency | null {
  const result = frequencySchema.safeParse({ type, config: config ?? {} });
  return result.success ? result.data : null;
}

export function isFlexible(f: Frequency): f is Extract<Frequency, { type: "weekly_flexible" }> {
  return f.type === "weekly_flexible";
}

const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function describeFrequency(f: Frequency): string {
  switch (f.type) {
    case "daily":
      return "Todos los días";
    case "every_other_day":
      return "Día por medio";
    case "weekly":
      return f.config.days.map((d) => WEEKDAYS_SHORT[d - 1]).join(", ");
    case "biweekly":
      return `Cada 2 semanas (${WEEKDAYS_SHORT[f.config.day - 1]})`;
    case "monthly":
      return `Día ${f.config.day} de cada mes`;
    case "weekly_flexible":
      return `${f.config.times} ${f.config.times === 1 ? "vez" : "veces"} por semana`;
  }
}

/** Unidad natural del streak individual de cada hábito. */
export function streakUnit(f: Frequency, n: number): string {
  const plural = n !== 1;
  switch (f.type) {
    case "daily":
    case "every_other_day":
      return plural ? "días" : "día";
    case "weekly":
    case "weekly_flexible":
      return plural ? "semanas" : "semana";
    case "biweekly":
      return plural ? "quincenas" : "quincena";
    case "monthly":
      return plural ? "meses" : "mes";
  }
}
