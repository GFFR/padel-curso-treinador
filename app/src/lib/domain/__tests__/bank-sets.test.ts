import { describe, expect, it } from "vitest";

import {
  buildActiveBankSetByTheme,
  isQuestionInActiveBankSet,
  resolveActiveBankSetId,
  type BankSetActivation,
} from "../bank-sets";

const activations: BankSetActivation[] = [
  { bankSetId: "global-v1", themeId: null },
  { bankSetId: "ed-v2", themeId: "theme-ed" },
];

describe("resolveActiveBankSetId", () => {
  it("returns global default when no per-theme override exists", () => {
    expect(resolveActiveBankSetId("theme-pdd", activations)).toBe("global-v1");
  });

  it("returns per-theme override when configured", () => {
    expect(resolveActiveBankSetId("theme-ed", activations)).toBe("ed-v2");
  });

  it("throws when global default is missing", () => {
    expect(() =>
      resolveActiveBankSetId("theme-pdd", [{ bankSetId: "x", themeId: "theme-ed" }]),
    ).toThrow("No global bank set activation configured.");
  });
});

describe("buildActiveBankSetByTheme", () => {
  it("maps each theme to its resolved bank set", () => {
    const map = buildActiveBankSetByTheme(["theme-ed", "theme-pdd"], activations);
    expect(map.get("theme-ed")).toBe("ed-v2");
    expect(map.get("theme-pdd")).toBe("global-v1");
  });
});

describe("isQuestionInActiveBankSet", () => {
  it("matches question bank set against active resolution", () => {
    expect(
      isQuestionInActiveBankSet(
        { themeId: "theme-ed", bankSetId: "ed-v2" },
        activations,
      ),
    ).toBe(true);
    expect(
      isQuestionInActiveBankSet(
        { themeId: "theme-ed", bankSetId: "global-v1" },
        activations,
      ),
    ).toBe(false);
  });
});
