/** Client-safe question shape: no correct answer, no explanation (exam mode). */
export interface RunnerQuestion {
  attemptQuestionId: string;
  position: number;
  prompt: string;
  options: { index: number; text: string }[];
  themeCode: string;
  /** Question bank status — unreviewed questions are visibly marked (ADR 0004). */
  status: string;
  selectedOptionIndex: number | null;
}

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
