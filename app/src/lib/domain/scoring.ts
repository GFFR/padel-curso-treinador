import { EXAM_TOTAL_QUESTIONS, PASS_SCORE } from "./types";

export interface ExamScore {
  /** Portuguese 0-20 scale, two decimals. */
  score0to20: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
}

/**
 * Simple proportional scoring (docs/exam-behavior.md): every question weighs
 * the same, wrong and unanswered score zero. For the standard 80-question exam
 * each correct answer is worth exactly 0.25 points.
 */
export function scoreExam(
  correctCount: number,
  totalQuestions: number = EXAM_TOTAL_QUESTIONS,
): ExamScore {
  if (totalQuestions <= 0) {
    throw new Error("An exam needs at least one question to be scored.");
  }
  if (correctCount < 0 || correctCount > totalQuestions) {
    throw new Error(
      `correctCount ${correctCount} out of range 0..${totalQuestions}.`,
    );
  }

  const raw = (correctCount * 20) / totalQuestions;
  const score0to20 = Math.round(raw * 100) / 100;

  return {
    score0to20,
    passed: score0to20 >= PASS_SCORE,
    correctCount,
    totalQuestions,
  };
}
