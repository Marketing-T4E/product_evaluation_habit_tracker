import { describe, expect, it } from "vitest";
import {
  addDays,
  daysInMonth,
  diffDays,
  eachDay,
  endOfWeek,
  isISODate,
  isoWeekday,
  isValidTimeZone,
  startOfWeek,
  todayInTimeZone,
} from "../dates";

describe("dates", () => {
  it("daysInMonth maneja meses de 28/29/30/31 días", () => {
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2025, 4)).toBe(30);
    expect(daysInMonth(2025, 1)).toBe(31);
    expect(daysInMonth(2025, 12)).toBe(31);
  });

  it("isISODate valida fechas reales", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2025-04-31")).toBe(false);
    expect(isISODate("2025-13-01")).toBe(false);
    expect(isISODate("2025-1-01")).toBe(false);
    expect(isISODate(42)).toBe(false);
  });

  it("addDays cruza meses, años y 29 de febrero", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2023-02-28", 1)).toBe("2023-03-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2025-01-31", 30)).toBe("2025-03-02");
  });

  it("diffDays y eachDay", () => {
    expect(diffDays("2025-03-01", "2025-02-01")).toBe(28);
    expect(diffDays("2024-03-01", "2024-02-01")).toBe(29);
    expect(eachDay("2024-02-27", "2024-03-01")).toEqual([
      "2024-02-27",
      "2024-02-28",
      "2024-02-29",
      "2024-03-01",
    ]);
    expect(eachDay("2025-01-02", "2025-01-01")).toEqual([]);
  });

  it("semanas ISO empiezan el lunes, incluso cruzando años", () => {
    expect(isoWeekday("2024-01-01")).toBe(1);
    expect(isoWeekday("2025-07-06")).toBe(7);
    expect(startOfWeek("2026-01-01")).toBe("2025-12-29");
    expect(endOfWeek("2025-12-29")).toBe("2026-01-04");
    expect(startOfWeek("2025-07-06")).toBe("2025-06-30");
    expect(startOfWeek("2025-06-30")).toBe("2025-06-30");
  });

  it("todayInTimeZone usa la zona del usuario, no la del servidor", () => {
    const instant = new Date("2025-01-01T02:30:00Z");
    expect(todayInTimeZone("UTC", instant)).toBe("2025-01-01");
    expect(todayInTimeZone("America/Santiago", instant)).toBe("2024-12-31");
    expect(todayInTimeZone("Asia/Tokyo", instant)).toBe("2025-01-01");
    expect(todayInTimeZone("Zona/Inventada", instant)).toBe("2025-01-01");
  });

  it("isValidTimeZone", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("Nada/Nada")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
