import { describe, expect, it } from "vitest";
import {
  activeDaysInWeek,
  completionsInWeek,
  flexibleWeekTarget,
  isActiveOn,
  isScheduledOn,
} from "../schedule";
import { parseFrequency } from "../frequency";
import { biweekly, daily, everyOther, flexible, habit, index, monthly, range, weekly } from "./helpers";

const scheduledDays = (h: ReturnType<typeof habit>, from: string, to: string) =>
  range(from, to).filter((d) => isScheduledOn(h, d));

describe("isActiveOn", () => {
  it("respeta fecha de inicio y archivado (exclusivo)", () => {
    const h = habit(daily(), "2025-03-10", "2025-03-15");
    expect(isActiveOn(h, "2025-03-09")).toBe(false);
    expect(isActiveOn(h, "2025-03-10")).toBe(true);
    expect(isActiveOn(h, "2025-03-14")).toBe(true);
    expect(isActiveOn(h, "2025-03-15")).toBe(false);
  });
});

describe("isScheduledOn", () => {
  it("diario: todos los días desde el inicio", () => {
    const h = habit(daily(), "2025-02-27");
    expect(scheduledDays(h, "2025-02-25", "2025-03-02")).toEqual([
      "2025-02-27",
      "2025-02-28",
      "2025-03-01",
      "2025-03-02",
    ]);
  });

  it("diario archivado deja de estar programado", () => {
    const h = habit(daily(), "2025-01-01", "2025-01-03");
    expect(scheduledDays(h, "2025-01-01", "2025-01-05")).toEqual(["2025-01-01", "2025-01-02"]);
  });

  it("día por medio: cuenta desde la fecha de inicio y cruza fin de mes", () => {
    const h = habit(everyOther(), "2025-01-30");
    expect(scheduledDays(h, "2025-01-28", "2025-02-05")).toEqual([
      "2025-01-30",
      "2025-02-01",
      "2025-02-03",
      "2025-02-05",
    ]);
  });

  it("día por medio en año bisiesto cruza el 29 de febrero", () => {
    const h = habit(everyOther(), "2024-02-27");
    expect(scheduledDays(h, "2024-02-27", "2024-03-03")).toEqual([
      "2024-02-27",
      "2024-02-29",
      "2024-03-02",
    ]);
  });

  it("semanal: días específicos (lunes y jueves)", () => {
    const h = habit(weekly([1, 4]), "2024-12-30");
    expect(scheduledDays(h, "2024-12-30", "2025-01-12")).toEqual([
      "2024-12-30",
      "2025-01-02",
      "2025-01-06",
      "2025-01-09",
    ]);
  });

  it("quincenal: cada 2 semanas desde la primera ocurrencia tras el inicio", () => {
    // Inicio miércoles 2025-01-01, día elegido lunes → primera vez 2025-01-06.
    const h = habit(biweekly(1), "2025-01-01");
    expect(scheduledDays(h, "2025-01-01", "2025-02-28")).toEqual([
      "2025-01-06",
      "2025-01-20",
      "2025-02-03",
      "2025-02-17",
    ]);
  });

  it("quincenal: si el inicio cae en el día elegido, cuenta ese mismo día", () => {
    const h = habit(biweekly(3), "2025-01-01");
    expect(scheduledDays(h, "2025-01-01", "2025-01-31")).toEqual([
      "2025-01-01",
      "2025-01-15",
      "2025-01-29",
    ]);
  });

  it("quincenal cruzando de año", () => {
    const h = habit(biweekly(1), "2025-12-15");
    expect(scheduledDays(h, "2025-12-15", "2026-01-31")).toEqual([
      "2025-12-15",
      "2025-12-29",
      "2026-01-12",
      "2026-01-26",
    ]);
  });

  it("mensual día 31: usa el último día en meses de 28/29/30 días", () => {
    const h = habit(monthly(31), "2024-01-01");
    expect(scheduledDays(h, "2024-01-01", "2024-06-30")).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
      "2024-04-30",
      "2024-05-31",
      "2024-06-30",
    ]);
    const h2 = habit(monthly(30), "2023-01-01");
    expect(scheduledDays(h2, "2023-02-01", "2023-03-31")).toEqual(["2023-02-28", "2023-03-30"]);
  });

  it("mensual día 15 normal", () => {
    const h = habit(monthly(15), "2025-01-20");
    expect(scheduledDays(h, "2025-01-01", "2025-03-31")).toEqual(["2025-02-15", "2025-03-15"]);
  });

  it("flexible nunca está programado en un día concreto", () => {
    const h = habit(flexible(4), "2025-01-01");
    expect(scheduledDays(h, "2025-01-01", "2025-01-31")).toEqual([]);
  });

  it("no programa días anteriores al inicio", () => {
    const h = habit(weekly([1, 2, 3, 4, 5, 6, 7]), "2025-01-10");
    expect(isScheduledOn(h, "2025-01-09")).toBe(false);
    expect(isScheduledOn(h, "2025-01-10")).toBe(true);
  });
});

describe("flexible semanal", () => {
  it("meta completa en semanas completas", () => {
    const h = habit(flexible(4), "2025-01-06");
    expect(activeDaysInWeek(h, "2025-01-06")).toBe(7);
    expect(flexibleWeekTarget(h, "2025-01-06")).toBe(4);
  });

  it("creado a mitad de semana: la meta se limita a los días activos", () => {
    const h = habit(flexible(4), "2025-01-10"); // viernes
    expect(activeDaysInWeek(h, "2025-01-06")).toBe(3);
    expect(flexibleWeekTarget(h, "2025-01-06")).toBe(3);
    const h2 = habit(flexible(2), "2025-01-10");
    expect(flexibleWeekTarget(h2, "2025-01-06")).toBe(2);
  });

  it("archivado a mitad de semana", () => {
    const h = habit(flexible(5), "2025-01-01", "2025-01-09"); // activo lun-mié
    expect(activeDaysInWeek(h, "2025-01-06")).toBe(3);
    expect(flexibleWeekTarget(h, "2025-01-06")).toBe(3);
    expect(flexibleWeekTarget(h, "2025-01-13")).toBe(0);
  });

  it("semana que cruza meses y años cuenta cumplimientos de ambos lados", () => {
    const h = habit(flexible(3), "2025-12-01", null, "flex");
    const idx = index({ flex: ["2025-12-30", "2025-12-31", "2026-01-02", "2026-01-05"] });
    expect(completionsInWeek(h, idx, "2025-12-29")).toBe(3);
  });

  it("ignora cumplimientos fuera del periodo activo", () => {
    const h = habit(flexible(3), "2025-01-08", null, "flex2");
    const idx = index({ flex2: ["2025-01-06", "2025-01-08"] });
    expect(completionsInWeek(h, idx, "2025-01-06")).toBe(1);
  });
});

describe("parseFrequency", () => {
  it("valida la configuración", () => {
    expect(parseFrequency("daily", {})).toEqual({ type: "daily", config: {} });
    expect(parseFrequency("weekly", { days: [4, 1, 1] })).toEqual({
      type: "weekly",
      config: { days: [1, 4] },
    });
    expect(parseFrequency("weekly", { days: [] })).toBeNull();
    expect(parseFrequency("monthly", { day: 32 })).toBeNull();
    expect(parseFrequency("weekly_flexible", { times: 8 })).toBeNull();
    expect(parseFrequency("hourly", {})).toBeNull();
  });
});
