export type AttemptStatus = "concluido" | "em_curso" | "expirado";

export interface AttemptProgress {
  total: number;
  answered: number;
  correct: number;
}

type AnswerRow =
  | { is_correct: boolean | null; selected_option_index: number | null }
  | { is_correct: boolean | null; selected_option_index: number | null }[]
  | null;

type QuestionRow = {
  exam_attempt_answers: AnswerRow;
};

export function resolveAttemptStatus(attempt: {
  submitted_at: string | null;
  mode: string;
  expires_at?: string | null;
}): AttemptStatus {
  if (attempt.submitted_at) return "concluido";
  if (
    attempt.mode === "exam" &&
    attempt.expires_at &&
    new Date(attempt.expires_at) < new Date()
  ) {
    return "expirado";
  }
  return "em_curso";
}

export function computeAttemptProgress(
  questions: QuestionRow[],
  fallbackTotal?: number,
): AttemptProgress {
  let answered = 0;
  let correct = 0;

  for (const question of questions) {
    const answer = Array.isArray(question.exam_attempt_answers)
      ? question.exam_attempt_answers[0]
      : question.exam_attempt_answers;
    if (answer?.selected_option_index != null) answered += 1;
    if (answer?.is_correct) correct += 1;
  }

  return {
    total: questions.length || fallbackTotal || 0,
    answered,
    correct,
  };
}

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  concluido: "Concluído",
  em_curso: "Em curso",
  expirado: "Expirado",
};
