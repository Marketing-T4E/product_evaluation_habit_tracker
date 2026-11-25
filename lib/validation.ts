import { z } from "zod";
import { isISODate, isValidTimeZone } from "./dates";
import { FREQUENCY_TYPES, frequencySchema, type Frequency } from "./frequency";

export const HABIT_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f43f5e", "#f97316", "#eab308", "#14b8a6",
  "#6366f1", "#64748b",
] as const;

export const THRESHOLD_OPTIONS = [50, 60, 70, 80, 90, 100] as const;

const isoDateSchema = z.string().refine(isISODate, "Fecha inválida");

export const habitInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80, "Máximo 80 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  icon: z.string().trim().min(1, "Elige un ícono").max(16, "Ícono inválido"),
  start_date: isoDateSchema,
  frequency: frequencySchema,
});

export type HabitInput = z.infer<typeof habitInputSchema>;

function intOrUndefined(v: FormDataEntryValue | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Construye el objeto de frecuencia a partir de los campos del formulario. */
export function frequencyFromFormData(fd: FormData): unknown {
  const type = String(fd.get("frequency_type") ?? "");
  switch (type) {
    case "weekly":
      return { type, config: { days: fd.getAll("weekly_days").map((d) => Number(d)) } };
    case "biweekly":
      return { type, config: { day: intOrUndefined(fd.get("biweekly_day")) } };
    case "monthly":
      return { type, config: { day: intOrUndefined(fd.get("monthly_day")) } };
    case "weekly_flexible":
      return { type, config: { times: intOrUndefined(fd.get("flexible_times")) } };
    default:
      return { type, config: {} };
  }
}

export function parseHabitFormData(fd: FormData) {
  return habitInputSchema.safeParse({
    name: String(fd.get("name") ?? ""),
    description: String(fd.get("description") ?? ""),
    color: String(fd.get("color") ?? ""),
    icon: String(fd.get("icon") ?? ""),
    start_date: String(fd.get("start_date") ?? ""),
    frequency: frequencyFromFormData(fd),
  });
}

export function frequencyToColumns(f: Frequency): {
  frequency_type: (typeof FREQUENCY_TYPES)[number];
  frequency_config: Record<string, unknown>;
} {
  return { frequency_type: f.type, frequency_config: f.config };
}

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80, "Máximo 80 caracteres"),
  timezone: z.string().refine(isValidTimeZone, "Zona horaria inválida"),
  streak_threshold: z.coerce
    .number()
    .int()
    .refine((n) => (THRESHOLD_OPTIONS as readonly number[]).includes(n), "Umbral inválido"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  timezone: z
    .string()
    .optional()
    .transform((tz) => (tz && isValidTimeZone(tz) ? tz : "UTC")),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email inválido")),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const toggleSchema = z.object({
  habitId: z.uuid(),
  date: isoDateSchema,
  done: z.boolean(),
});

/** Primer mensaje de error por campo (para mostrar en formularios). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] === "frequency" ? "frequency" : String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
