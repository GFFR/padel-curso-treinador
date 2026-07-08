import { describe, expect, it } from "vitest";

import type { BlueprintEntry } from "../blueprint";
import {
  selectExamQuestions,
  selectFromThemePool,
  type SelectableQuestion,
} from "../assembly";
import { seededRng } from "../rng";

function makeBank(
  themeId: string,
  count: number,
  seenCount = 0,
  prefix = themeId,
  anchorKey: string | null = null,
): SelectableQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    questionId: `${prefix}-q${i}`,
    themeId,
    seenCount,
    anchorKey,
  }));
}

function makeAnchoredBank(
  themeId: string,
  anchors: string[],
  perAnchor: number,
  seenCount = 0,
): SelectableQuestion[] {
  const bank: SelectableQuestion[] = [];
  for (const anchor of anchors) {
    for (let i = 0; i < perAnchor; i++) {
      bank.push({
        questionId: `${anchor}-q${i}`,
        themeId,
        seenCount,
        anchorKey: anchor,
      });
    }
  }
  return bank;
}

const blueprint: BlueprintEntry[] = [
  { themeId: "ed", code: "ED", target: 4 },
  { themeId: "da", code: "DA", target: 4 },
];

describe("selectExamQuestions", () => {
  it("fills every theme target when the bank is large enough", () => {
    const bank = [...makeBank("ed", 20), ...makeBank("da", 20)];
    const selection = selectExamQuestions(blueprint, bank, seededRng(1));
    expect(selection.orderedQuestionIds).toHaveLength(8);
    for (const theme of selection.perTheme) {
      expect(theme.selected).toHaveLength(4);
      expect(theme.shortfall).toBe(0);
    }
  });

  it("never selects the same question twice in one attempt", () => {
    const bank = [...makeBank("ed", 5), ...makeBank("da", 5)];
    const selection = selectExamQuestions(blueprint, bank, seededRng(2));
    const ids = selection.orderedQuestionIds;
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers unseen questions over seen ones (repeat suppression)", () => {
    const unseen = makeBank("ed", 4, 0, "unseen");
    const seen = makeBank("ed", 10, 3, "seen");
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 4 }],
      [...seen, ...unseen],
      seededRng(3),
    );
    const picked = selection.perTheme[0].selected;
    expect(picked.every((id) => id.startsWith("unseen"))).toBe(true);
  });

  it("falls back to already-seen questions when unseen ones run out", () => {
    const unseen = makeBank("ed", 2, 0, "unseen");
    const seen = makeBank("ed", 10, 2, "seen");
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 6 }],
      [...seen, ...unseen],
      seededRng(4),
    );
    const picked = selection.perTheme[0].selected;
    expect(picked).toHaveLength(6);
    expect(picked.filter((id) => id.startsWith("unseen"))).toHaveLength(2);
    expect(picked.filter((id) => id.startsWith("seen"))).toHaveLength(4);
  });

  it("prefers less-seen over more-seen among repeats", () => {
    const seenOnce = makeBank("ed", 3, 1, "once");
    const seenLots = makeBank("ed", 10, 9, "lots");
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 3 }],
      [...seenLots, ...seenOnce],
      seededRng(5),
    );
    expect(
      selection.perTheme[0].selected.every((id) => id.startsWith("once")),
    ).toBe(true);
  });

  it("records a shortfall instead of duplicating when the theme bank is too small", () => {
    const bank = makeBank("ed", 2);
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 6 }],
      bank,
      seededRng(6),
    );
    expect(selection.perTheme[0].selected).toHaveLength(2);
    expect(selection.perTheme[0].shortfall).toBe(4);
    expect(new Set(selection.orderedQuestionIds).size).toBe(2);
  });

  it("is reproducible for the same seed and varies across seeds", () => {
    const bank = [...makeBank("ed", 30), ...makeBank("da", 30)];
    const a = selectExamQuestions(blueprint, bank, seededRng(7));
    const b = selectExamQuestions(blueprint, bank, seededRng(7));
    const c = selectExamQuestions(blueprint, bank, seededRng(8));
    expect(a.orderedQuestionIds).toEqual(b.orderedQuestionIds);
    expect(a.orderedQuestionIds).not.toEqual(c.orderedQuestionIds);
  });

  it("shuffles the final order across themes (not grouped by theme)", () => {
    const bank = [...makeBank("ed", 40), ...makeBank("da", 40)];
    const big: BlueprintEntry[] = [
      { themeId: "ed", code: "ED", target: 20 },
      { themeId: "da", code: "DA", target: 20 },
    ];
    const selection = selectExamQuestions(big, bank, seededRng(9));
    const order = selection.orderedQuestionIds.map((id) =>
      id.startsWith("ed") ? "ed" : "da",
    );
    const transitions = order.filter((v, i) => i > 0 && v !== order[i - 1]);
    expect(transitions.length).toBeGreaterThan(1);
  });

  it("picks from distinct anchors when the bank allows", () => {
    const bank = makeAnchoredBank("ed", ["a1", "a2", "a3", "a4", "a5"], 3);
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 4 }],
      bank,
      seededRng(10),
    );
    const picked = selection.perTheme[0].selected;
    const anchors = new Set(
      picked.map((id) => id.split("-q")[0]),
    );
    expect(anchors.size).toBe(4);
  });

  it("fills target from one anchor when the bank is anchor-skewed", () => {
    const bank = makeAnchoredBank("ed", ["only"], 20);
    const selection = selectExamQuestions(
      [{ themeId: "ed", code: "ED", target: 4 }],
      bank,
      seededRng(11),
    );
    expect(selection.perTheme[0].selected).toHaveLength(4);
    expect(new Set(selection.perTheme[0].selected).size).toBe(4);
  });

  it("prefers unseen on a new anchor over unseen on a used anchor", () => {
    const bank: SelectableQuestion[] = [
      {
        questionId: "used-unseen",
        themeId: "ed",
        seenCount: 0,
        anchorKey: "a1",
      },
      {
        questionId: "new-unseen",
        themeId: "ed",
        seenCount: 0,
        anchorKey: "a2",
      },
      {
        questionId: "used-seen",
        themeId: "ed",
        seenCount: 5,
        anchorKey: "a1",
      },
    ];
    const picked = selectFromThemePool(bank, 2, seededRng(12));
    expect(picked).toContain("used-unseen");
    expect(picked).toContain("new-unseen");
    expect(picked).toHaveLength(2);
  });

  it("spreads across anchors in practice-sized sessions before repeats", () => {
    const bank = makeAnchoredBank("ed", ["a1", "a2", "a3", "a4", "a5"], 2);
    const picked = selectFromThemePool(bank, 10, seededRng(13));
    const anchors = picked.map((id) => id.split("-q")[0]);
    expect(new Set(anchors).size).toBeGreaterThanOrEqual(5);
  });
});
