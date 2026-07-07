import { describe, expect, it } from "vitest";

import { scoreExam } from "../scoring";

describe("scoreExam", () => {
  it("scores 0.25 per correct answer on the standard 80-question exam", () => {
    expect(scoreExam(0, 80).score0to20).toBe(0);
    expect(scoreExam(1, 80).score0to20).toBe(0.25);
    expect(scoreExam(40, 80).score0to20).toBe(10);
    expect(scoreExam(80, 80).score0to20).toBe(20);
  });

  it("passes exactly at 9.5 (38 correct out of 80)", () => {
    expect(scoreExam(38, 80)).toMatchObject({ score0to20: 9.5, passed: true });
    expect(scoreExam(37, 80)).toMatchObject({ score0to20: 9.25, passed: false });
  });

  it("scales proportionally for non-standard totals (short practice banks)", () => {
    expect(scoreExam(5, 10).score0to20).toBe(10);
    expect(scoreExam(19, 40).score0to20).toBe(9.5);
    expect(scoreExam(19, 40).passed).toBe(true);
  });

  it("rejects invalid input", () => {
    expect(() => scoreExam(-1, 80)).toThrow();
    expect(() => scoreExam(81, 80)).toThrow();
    expect(() => scoreExam(0, 0)).toThrow();
  });
});
