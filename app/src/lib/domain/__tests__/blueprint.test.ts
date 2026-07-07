import { describe, expect, it } from "vitest";

import { computeBlueprint, type ThemeWeight } from "../blueprint";

/** The current calendar (docs/course-material-map.md). */
const calendar: ThemeWeight[] = [
  { themeId: "t-pdd", code: "PDD", calendarHours: 15, sortOrder: 1 },
  { themeId: "t-tmtd", code: "TMTD", calendarHours: 12, sortOrder: 2 },
  { themeId: "t-fch", code: "FCH", calendarHours: 3, sortOrder: 3 },
  { themeId: "t-doping", code: "FCH_DOPING", calendarHours: 2, sortOrder: 4 },
  { themeId: "t-ed", code: "ED", calendarHours: 2, sortOrder: 5 },
  { themeId: "t-da", code: "DA", calendarHours: 2, sortOrder: 6 },
];

describe("computeBlueprint", () => {
  it("reproduces the documented 80-question blueprint for the current calendar", () => {
    const blueprint = computeBlueprint(calendar, 80, 4);
    expect(Object.fromEntries(blueprint.map((b) => [b.code, b.target]))).toEqual({
      PDD: 33,
      TMTD: 27,
      FCH: 7,
      FCH_DOPING: 5,
      ED: 4,
      DA: 4,
    });
  });

  it("gives the remainder-tie question to the first theme in calendar order", () => {
    // PDD/TMTD/FCH get their extras by larger remainder; the three tied
    // two-hour themes compete for the last slot and FCH_DOPING comes first.
    const blueprint = computeBlueprint(calendar, 80, 4);
    const doping = blueprint.find((b) => b.code === "FCH_DOPING")!;
    const ed = blueprint.find((b) => b.code === "ED")!;
    const da = blueprint.find((b) => b.code === "DA")!;
    expect(doping.target).toBe(5);
    expect(ed.target).toBe(4);
    expect(da.target).toBe(4);
  });

  it("always sums to the exam total", () => {
    for (const total of [80, 40, 60, 100]) {
      const blueprint = computeBlueprint(calendar, total, 4);
      const sum = blueprint.reduce((acc, b) => acc + b.target, 0);
      expect(sum).toBe(total);
    }
  });

  it("guarantees the minimum per taught theme even for tiny shares", () => {
    const skewed: ThemeWeight[] = [
      { themeId: "a", code: "A", calendarHours: 100, sortOrder: 1 },
      { themeId: "b", code: "B", calendarHours: 1, sortOrder: 2 },
    ];
    const blueprint = computeBlueprint(skewed, 80, 4);
    expect(blueprint.find((b) => b.code === "B")!.target).toBeGreaterThanOrEqual(4);
    expect(blueprint.reduce((acc, b) => acc + b.target, 0)).toBe(80);
  });

  it("trims from the largest theme when minimums overshoot the total", () => {
    const many: ThemeWeight[] = [
      { themeId: "a", code: "A", calendarHours: 50, sortOrder: 1 },
      { themeId: "b", code: "B", calendarHours: 1, sortOrder: 2 },
      { themeId: "c", code: "C", calendarHours: 1, sortOrder: 3 },
    ];
    const blueprint = computeBlueprint(many, 12, 4);
    expect(blueprint.reduce((acc, b) => acc + b.target, 0)).toBe(12);
    expect(blueprint.every((b) => b.target >= 4)).toBe(true);
  });

  it("rejects impossible minimums", () => {
    expect(() => computeBlueprint(calendar, 20, 4)).toThrow();
  });

  it("is deterministic", () => {
    const a = computeBlueprint(calendar, 80, 4);
    const b = computeBlueprint(calendar, 80, 4);
    expect(a).toEqual(b);
  });
});
