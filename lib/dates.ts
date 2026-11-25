/**
 * Utilidades de fechas "de calendario" (sin hora) representadas como
 * strings ISO `YYYY-MM-DD`. Toda la aritmética se hace en UTC sobre números
 * de día, por lo que no depende de la zona horaria del servidor.
 */

export type ISODate = string;

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  // month: 1-12. Día 0 del mes siguiente = último día del mes.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseISODate(s: string): { year: number; month: number; day: number } {
  const m = ISO_RE.exec(s);
  if (!m) throw new Error(`Fecha inválida: ${s}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== "string") return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function toDayNumber(s: ISODate): number {
  const { year, month, day } = parseISODate(s);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function fromDayNumber(n: number): ISODate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(s: ISODate, n: number): ISODate {
  return fromDayNumber(toDayNumber(s) + n);
}

/** a - b en días. */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(a) - toDayNumber(b);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(s: ISODate): number {
  const d = new Date(toDayNumber(s) * DAY_MS).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Lunes de la semana que contiene `s`. */
export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, 1 - isoWeekday(s));
}

/** Domingo de la semana que contiene `s`. */
export function endOfWeek(s: ISODate): ISODate {
  return addDays(startOfWeek(s), 6);
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** Lista de fechas entre `from` y `to` (ambas incluidas). */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const start = toDayNumber(from);
  const end = toDayNumber(to);
  for (let n = start; n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Fecha local (YYYY-MM-DD) del instante `now` en la zona horaria `tz`. */
export function todayInTimeZone(tz: string, now: Date = new Date()): ISODate {
  const zone = isValidTimeZone(tz) ? tz : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const WEEKDAY_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function weekdayName(isoDay: number, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY_LONG)[isoDay - 1] ?? "";
}

/** "martes 25 de noviembre" */
export function formatLongDate(s: ISODate): string {
  const { month, day } = parseISODate(s);
  return `${weekdayName(isoWeekday(s))} ${day} de ${MONTHS[month - 1]}`;
}

/** "25 nov 2026" */
export function formatShortDate(s: ISODate): string {
  const { year, month, day } = parseISODate(s);
  return `${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
}
