import { describe, expect, it } from "vitest";
import {
  bestAndWorstWeekday,
  dailyCompletion,
  habitRanking,
  habitTally,
  overallTally,
  rangeStart,
  rate,
  weekdayStats,
  weeklyTrend,
} from "../metrics";
import { daily, flexible, habit, index, monthly, range, weekly } from "./helpers";

describe("habitTally", () => {
  it("solo cuenta días programados y activos", () => {
    const h = habit(weekly([1, 3, 5]), "2025-01-08", "2025-01-18", "x");
    // Programados activos: 08(mié),10(vie),13(lun),15(mié),17(vie)
    const idx = index({ x: ["2025-01-08", "2025-01-13", "2025-01-14", "2025-01-17"] });
    expect(habitTally(h, idx, "2025-01-01", "2025-01-31", "2025-02-01")).toEqual({
      done: 3,
      total: 5,
    });
  });

  it("hoy solo cuenta si ya está cumplido", () => {
    const h = habit(daily(), "2025-01-01", null, "x");
    expect(habitTally(h, index({}), "2025-01-01", "2025-01-03", "2025-01-03")).toEqual({
      done: 0,
      total: 2,
    });
    expect(
      habitTally(h, index({ x: ["2025-01-03"] }), "2025-01-01", "2025-01-03", "2025-01-03"),
    ).toEqual({ done: 1, total: 3 });
  });

  it("flexible: semanas cerradas aportan la meta; la en curso solo lo cumplido", () => {
    const h = habit(flexible(3), "2025-01-06", null, "x");
    const idx = index({ x: ["2025-01-06", "2025-01-07", "2025-01-13"] });
    expect(habitTally(h, idx, "2025-01-06", "2025-01-15", "2025-01-15")).toEqual({
      done: 3,
      total: 4,
    });
  });

  it("flexible: cumplimientos por encima de la meta no superan el 100%", () => {
    const h = habit(flexible(2), "2025-01-06", null, "x");
    const idx = index({ x: range("2025-01-06", "2025-01-12") });
    expect(rate(habitTally(h, idx, "2025-01-06", "2025-01-12", "2025-01-20"))).toBe(1);
  });

  it("mensual en febrero de año no bisiesto", () => {
    const h = habit(monthly(31), "2023-01-01", null, "x");
    const idx = index({ x: ["2023-01-31", "2023-02-28"] });
    expect(habitTally(h, idx, "2023-01-01", "2023-03-31", "2023-04-01")).toEqual({
      done: 2,
      total: 3,
    });
  });

  it("rango sin oportunidades devuelve rate null", () => {
    const h = habit(daily(), "2025-05-01", null, "x");
    expect(rate(habitTally(h, index({}), "2025-01-01", "2025-01-31", "2025-06-01"))).toBeNull();
  });
});

describe("métricas globales", () => {
  const a = habit(daily(), "2025-01-06", null, "a");
  const b = habit(weekly([1]), "2025-01-06", null, "b");
  const idx = index({
    a: ["2025-01-06", "2025-01-07", "2025-01-08", "2025-01-13"],
    b: ["2025-01-13"],
  });
  const today = "2025-01-14";

  it("overallTally suma todos los hábitos", () => {
    // a: 6..13 = 8 días, 4 hechos (hoy 14 sin hacer no cuenta). b: 06 ✗, 13 ✓.
    expect(overallTally([a, b], idx, "2025-01-01", today, today)).toEqual({ done: 5, total: 10 });
  });

  it("heatmap diario", () => {
    const days = dailyCompletion([a, b], idx, "2025-01-05", "2025-01-06");
    expect(days[0]).toEqual({ date: "2025-01-05", done: 0, total: 0, pct: null });
    expect(days[1]).toEqual({ date: "2025-01-06", done: 1, total: 2, pct: 0.5 });
  });

  it("tendencia semanal", () => {
    const trend = weeklyTrend([a, b], idx, today, 3);
    expect(trend.map((w) => w.weekStart)).toEqual(["2024-12-30", "2025-01-06", "2025-01-13"]);
    expect(trend[0].pct).toBeNull();
    expect(trend[1]).toMatchObject({ done: 3, total: 8 });
    expect(trend[2]).toMatchObject({ done: 2, total: 2, pct: 1 });
  });

  it("mejor y peor día de la semana", () => {
    const stats = weekdayStats([a, b], idx, today);
    expect(stats[0]).toMatchObject({ weekday: 1, done: 3, total: 4 });
    const { best, worst } = bestAndWorstWeekday(stats);
    expect(best?.weekday).toBe(2); // martes 7: 1/1 (hoy no cuenta)
    expect(worst?.weekday).toBe(4); // jueves: 0/1
  });

  it("ranking de hábitos", () => {
    const ranking = habitRanking([a, b], idx, today);
    // Empate al 50%: primero el que tiene más oportunidades.
    expect(ranking.map((r) => r.habitId)).toEqual(["a", "b"]);
    const idx2 = index({ a: ["2025-01-06"], b: ["2025-01-06", "2025-01-13"] });
    expect(habitRanking([a, b], idx2, today).map((r) => r.habitId)).toEqual(["b", "a"]);
  });

  it("rangeStart", () => {
    expect(rangeStart("7d", "2025-03-01", [])).toBe("2025-02-23");
    expect(rangeStart("30d", "2024-03-01", [])).toBe("2024-02-01");
    expect(rangeStart("all", "2025-03-01", [a, b])).toBe("2025-01-06");
  });
});
