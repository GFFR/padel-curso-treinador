import { describe, expect, it } from "vitest";

import { permuteOptions, type PermutableOption } from "../options";
import { seededRng } from "../rng";

const options: PermutableOption[] = [
  { index: 0, text: "correta", justification: "porque sim" },
  { index: 1, text: "distrator 1" },
  { index: 2, text: "distrator 2" },
  { index: 3, text: "distrator 3" },
];

describe("permuteOptions", () => {
  it("keeps the correct answer text under the remapped index", () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = permuteOptions(options, 0, seededRng(seed));
      expect(result.options[result.correctOptionIndex].text).toBe("correta");
    }
  });

  it("re-indexes options contiguously 0..3 and preserves the full set", () => {
    const result = permuteOptions(options, 0, seededRng(7));
    expect(result.options.map((o) => o.index)).toEqual([0, 1, 2, 3]);
    expect(new Set(result.options.map((o) => o.text))).toEqual(
      new Set(options.map((o) => o.text)),
    );
  });

  it("keeps justifications attached to their option text", () => {
    const result = permuteOptions(options, 0, seededRng(11));
    const correct = result.options.find((o) => o.text === "correta");
    expect(correct?.justification).toBe("porque sim");
  });

  it("actually varies the correct position across seeds", () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 40; seed++) {
      positions.add(permuteOptions(options, 0, seededRng(seed)).correctOptionIndex);
    }
    expect(positions.size).toBe(4);
  });

  it("is deterministic for the same seed", () => {
    const a = permuteOptions(options, 0, seededRng(3));
    const b = permuteOptions(options, 0, seededRng(3));
    expect(a).toEqual(b);
  });
});
