import { describe, expect, it } from "vitest";
import { buildDayView, canLogHabitOn, isLoggableDate, oldestLoggableDate } from "../today";
import { parseHabitFormData } from "../validation";
import { daily, flexible, habit, index, weekly } from "./helpers";

describe("buildDayView", () => {
  it("separa programados y flexibles con progreso semanal", () => {
    const a = habit(daily(), "2025-01-01", null, "a");
    const w = habit(weekly([2]), "2025-01-01", null, "w"); // martes
    const f = habit(flexible(4), "2025-01-01", null, "f");
    const archived = habit(daily(), "2025-01-01", "2025-01-10", "z");
    const idx = index({ a: ["2025-01-15"], f: ["2025-01-13", "2025-01-14"] });
    const view = buildDayView([a, w, f, archived], idx, "2025-01-15"); // miércoles
    expect(view.scheduled.map((s) => s.habit.id)).toEqual(["a"]);
    expect(view.completed).toBe(1);
    expect(view.total).toBe(1);
    expect(view.flexible[0]).toMatchObject({ weekCount: 2, target: 4, goalMet: false, done: false });
  });

  it("flexible con meta alcanzada se marca como cumplido", () => {
    const f = habit(flexible(2), "2025-01-01", null, "f");
    const idx = index({ f: ["2025-01-13", "2025-01-14"] });
    expect(buildDayView([f], idx, "2025-01-16").flexible[0].goalMet).toBe(true);
  });
});

describe("fechas registrables", () => {
  it("hasta 7 días atrás y nunca futuro", () => {
    expect(isLoggableDate("2025-01-15", "2025-01-15")).toBe(true);
    expect(isLoggableDate("2025-01-08", "2025-01-15")).toBe(true);
    expect(isLoggableDate("2025-01-07", "2025-01-15")).toBe(false);
    expect(isLoggableDate("2025-01-16", "2025-01-15")).toBe(false);
    expect(oldestLoggableDate("2025-03-03")).toBe("2025-02-24");
  });

  it("solo se registra en días programados (o activos si es flexible)", () => {
    const w = habit(weekly([1]), "2025-01-01");
    expect(canLogHabitOn(w, "2025-01-13")).toBe(true);
    expect(canLogHabitOn(w, "2025-01-14")).toBe(false);
    const f = habit(flexible(3), "2025-01-10");
    expect(canLogHabitOn(f, "2025-01-09")).toBe(false);
    expect(canLogHabitOn(f, "2025-01-14")).toBe(true);
  });
});

describe("parseHabitFormData", () => {
  function fd(entries: [string, string][]) {
    const f = new FormData();
    for (const [k, v] of entries) f.append(k, v);
    return f;
  }
  const base: [string, string][] = [
    ["name", "  Leer  "],
    ["description", ""],
    ["color", "#10b981"],
    ["icon", "📚"],
    ["start_date", "2025-01-01"],
  ];

  it("semanal con días múltiples", () => {
    const r = parseHabitFormData(
      fd([...base, ["frequency_type", "weekly"], ["weekly_days", "4"], ["weekly_days", "1"]]),
    );
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe("Leer");
    expect(r.data?.description).toBeNull();
    expect(r.data?.frequency).toEqual({ type: "weekly", config: { days: [1, 4] } });
  });

  it("rechaza configuraciones inválidas", () => {
    expect(parseHabitFormData(fd([...base, ["frequency_type", "weekly"]])).success).toBe(false);
    expect(
      parseHabitFormData(fd([...base, ["frequency_type", "monthly"], ["monthly_day", "0"]])).success,
    ).toBe(false);
    expect(
      parseHabitFormData(
        fd([...base.slice(0, 4), ["start_date", "2025-02-30"], ["frequency_type", "daily"]]),
      ).success,
    ).toBe(false);
  });
});
