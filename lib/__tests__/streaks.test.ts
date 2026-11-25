import { describe, expect, it } from "vitest";
import {
  computeGlobalStreak,
  computeHabitStreak,
  globalDayStatuses,
  habitPeriods,
  streakFromStatuses,
} from "../streaks";
import { biweekly, daily, everyOther, flexible, habit, index, monthly, range, weekly } from "./helpers";

describe("streakFromStatuses", () => {
  it("neutrales no suman ni rompen", () => {
    expect(
      streakFromStatuses(["success", "neutral", "success", "fail", "success", "neutral", "success"]),
    ).toEqual({ current: 2, best: 2 });
    expect(streakFromStatuses(["success", "success", "success", "fail"])).toEqual({
      current: 0,
      best: 3,
    });
    expect(streakFromStatuses([])).toEqual({ current: 0, best: 0 });
  });
});

describe("streak global", () => {
  it("cuenta días consecutivos al 100% y hoy no lo rompe", () => {
    const a = habit(daily(), "2025-03-01", null, "a");
    const idx = index({ a: range("2025-03-01", "2025-03-09") });
    expect(computeGlobalStreak([a], idx, "2025-03-10", 100)).toEqual({ current: 9, best: 9 });
    const idx2 = index({ a: range("2025-03-01", "2025-03-10") });
    expect(computeGlobalStreak([a], idx2, "2025-03-10", 100)).toEqual({ current: 10, best: 10 });
  });

  it("un día fallado rompe el streak", () => {
    const a = habit(daily(), "2025-03-01", null, "a");
    const done = range("2025-03-01", "2025-03-10").filter((d) => d !== "2025-03-04");
    const idx = index({ a: done });
    expect(computeGlobalStreak([a], idx, "2025-03-10", 100)).toEqual({ current: 6, best: 6 });
  });

  it("umbral parcial: 50% permite cumplir solo la mitad", () => {
    const a = habit(daily(), "2025-03-01", null, "a");
    const b = habit(daily(), "2025-03-01", null, "b");
    const idx = index({ a: range("2025-03-01", "2025-03-05") });
    expect(computeGlobalStreak([a, b], idx, "2025-03-06", 50).current).toBe(5);
    expect(computeGlobalStreak([a, b], idx, "2025-03-06", 100).current).toBe(0);
    // 3 hábitos, 1 cumplido = 33% < 50% → falla.
    const c = habit(daily(), "2025-03-01", null, "c");
    expect(computeGlobalStreak([a, b, c], idx, "2025-03-06", 50).current).toBe(0);
    // 80% con 5 hábitos y 4 cumplidos → cumple.
    const hs = ["p", "q", "r", "s", "t"].map((id) => habit(daily(), "2025-03-01", null, id));
    const idx4 = index({
      p: ["2025-03-01"],
      q: ["2025-03-01"],
      r: ["2025-03-01"],
      s: ["2025-03-01"],
    });
    expect(computeGlobalStreak(hs, idx4, "2025-03-02", 80).current).toBe(1);
    expect(computeGlobalStreak(hs, idx4, "2025-03-02", 90).current).toBe(0);
  });

  it("días sin hábitos programados son neutrales", () => {
    const h = habit(weekly([1, 3]), "2025-01-06", null, "w"); // lun y mié
    const idx = index({ w: ["2025-01-06", "2025-01-08", "2025-01-13"] });
    const statuses = globalDayStatuses([h], idx, "2025-01-14", 100);
    expect(statuses.get("2025-01-07")).toBe("neutral");
    expect(computeGlobalStreak([h], idx, "2025-01-14", 100)).toEqual({ current: 3, best: 3 });
  });

  it("hábitos archivados no cuentan después de archivarse", () => {
    const a = habit(daily(), "2025-03-01", null, "a");
    const b = habit(daily(), "2025-03-01", "2025-03-04", "b");
    const idx = index({ a: range("2025-03-01", "2025-03-08"), b: range("2025-03-01", "2025-03-03") });
    expect(computeGlobalStreak([a, b], idx, "2025-03-08", 100)).toEqual({ current: 8, best: 8 });
  });

  it("flexible fallido rompe el streak el domingo de esa semana", () => {
    const d = habit(daily(), "2025-01-06", null, "d");
    const f = habit(flexible(3), "2025-01-06", null, "f");
    const idx = index({
      d: range("2025-01-06", "2025-01-15"),
      f: ["2025-01-07", "2025-01-09"], // solo 2 de 3
    });
    const statuses = globalDayStatuses([d, f], idx, "2025-01-15", 100);
    expect(statuses.get("2025-01-11")).toBe("success");
    expect(statuses.get("2025-01-12")).toBe("fail");
    expect(computeGlobalStreak([d, f], idx, "2025-01-15", 100)).toEqual({ current: 3, best: 6 });
  });

  it("flexible cumplido no rompe; la semana en curso tampoco", () => {
    const d = habit(daily(), "2025-01-06", null, "d");
    const f = habit(flexible(2), "2025-01-06", null, "f");
    const idx = index({ d: range("2025-01-06", "2025-01-15"), f: ["2025-01-06", "2025-01-08"] });
    expect(computeGlobalStreak([d, f], idx, "2025-01-15", 100).current).toBe(10);
    // Hoy es domingo: la semana aún no termina.
    const idx2 = index({ d: range("2025-01-06", "2025-01-12") });
    expect(computeGlobalStreak([d, f], idx2, "2025-01-12", 100).current).toBe(7);
  });

  it("flexible creado a mitad de semana usa meta proporcional", () => {
    const f = habit(flexible(4), "2025-01-11", null, "f"); // sábado: 2 días activos
    const d = habit(daily(), "2025-01-06", null, "d");
    const idx = index({ d: range("2025-01-06", "2025-01-13"), f: ["2025-01-11", "2025-01-12"] });
    expect(globalDayStatuses([d, f], idx, "2025-01-13", 100).get("2025-01-12")).toBe("success");
  });

  it("sin hábitos o con inicio futuro el streak es 0", () => {
    expect(computeGlobalStreak([], index({}), "2025-01-01", 100)).toEqual({ current: 0, best: 0 });
    const h = habit(daily(), "2025-02-01");
    expect(computeGlobalStreak([h], index({}), "2025-01-01", 100)).toEqual({ current: 0, best: 0 });
  });
});

describe("streak por hábito", () => {
  it("diario en días; hoy pendiente no rompe", () => {
    const h = habit(daily(), "2025-01-01", null, "x");
    const idx = index({ x: range("2025-01-01", "2025-01-04") });
    expect(computeHabitStreak(h, idx, "2025-01-05")).toEqual({ current: 4, best: 4 });
  });

  it("día por medio cuenta ocurrencias", () => {
    const h = habit(everyOther(), "2025-01-01", null, "x");
    const idx = index({ x: ["2025-01-01", "2025-01-03", "2025-01-07"] });
    // 01 ✓, 03 ✓, 05 ✗, 07 ✓
    expect(computeHabitStreak(h, idx, "2025-01-08")).toEqual({ current: 1, best: 2 });
  });

  it("semanal cuenta semanas con todos los días cumplidos", () => {
    const h = habit(weekly([1, 4]), "2025-01-06", null, "x");
    const idx = index({ x: ["2025-01-06", "2025-01-09", "2025-01-13", "2025-01-16", "2025-01-20"] });
    const periods = habitPeriods(h, idx, "2025-01-21");
    expect(periods.map((p) => p.status)).toEqual(["success", "success", "pending"]);
    expect(computeHabitStreak(h, idx, "2025-01-21")).toEqual({ current: 2, best: 2 });
  });

  it("semanal: un día pasado sin cumplir en la semana en curso ya es fallo", () => {
    const h = habit(weekly([1, 4]), "2025-01-06", null, "x");
    const idx = index({ x: ["2025-01-09"] });
    expect(habitPeriods(h, idx, "2025-01-10").map((p) => p.status)).toEqual(["fail"]);
  });

  it("quincenal cuenta quincenas", () => {
    const h = habit(biweekly(1), "2025-01-06", null, "x");
    const idx = index({ x: ["2025-01-06", "2025-01-20", "2025-02-03"] });
    expect(computeHabitStreak(h, idx, "2025-02-10")).toEqual({ current: 3, best: 3 });
  });

  it("mensual cuenta meses, incluido febrero bisiesto", () => {
    const h = habit(monthly(31), "2024-01-01", null, "x");
    const idx = index({ x: ["2024-01-31", "2024-02-29", "2024-03-31"] });
    expect(computeHabitStreak(h, idx, "2024-04-15")).toEqual({ current: 3, best: 3 });
    expect(computeHabitStreak(h, idx, "2024-05-01")).toEqual({ current: 0, best: 3 });
  });

  it("flexible cuenta semanas que alcanzan la meta", () => {
    const h = habit(flexible(2), "2025-01-06", null, "x");
    const idx = index({
      x: ["2025-01-06", "2025-01-07", "2025-01-13", "2025-01-20", "2025-01-21", "2025-01-27"],
    });
    // Semana 06 ✓, 13 ✗ (1/2), 20 ✓, 27 en curso (1/2) → pendiente.
    expect(habitPeriods(h, idx, "2025-01-28").map((p) => p.status)).toEqual([
      "success",
      "fail",
      "success",
      "pending",
    ]);
    expect(computeHabitStreak(h, idx, "2025-01-28")).toEqual({ current: 1, best: 1 });
  });

  it("hábito archivado no genera periodos después del archivado", () => {
    const h = habit(daily(), "2025-01-01", "2025-01-04", "x");
    const idx = index({ x: range("2025-01-01", "2025-01-03") });
    expect(habitPeriods(h, idx, "2025-02-01")).toHaveLength(3);
    expect(computeHabitStreak(h, idx, "2025-02-01")).toEqual({ current: 3, best: 3 });
  });
});
