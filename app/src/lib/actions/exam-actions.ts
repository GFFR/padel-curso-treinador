"use server";

import { redirect } from "next/navigation";

import { requireStudent } from "@/lib/auth";
import {
  answerAttemptQuestion,
  createExamAttempt,
  createPracticeSession,
  submitExamAttempt,
} from "@/lib/services/exam-service";
import type { SourceScope } from "@/lib/domain/types";

export async function startExam(sourceScope: SourceScope): Promise<void> {
  const { supabase, studentId } = await requireStudent();
  const attempt = await createExamAttempt(supabase, { studentId, sourceScope });
  redirect(`/exame/${attempt.attemptId}`);
}

export async function startPractice(
  themeId: string,
  sourceScope: SourceScope,
): Promise<void> {
  const { supabase, studentId } = await requireStudent();
  const attempt = await createPracticeSession(supabase, {
    studentId,
    themeId,
    sourceScope,
  });
  redirect(`/praticar/${attempt.attemptId}`);
}

export interface AnswerResult {
  isCorrect: boolean;
  correctOptionIndex: number;
  explanation: string;
  optionJustifications: (string | null)[];
  manualReference: {
    fileName: string | null;
    page: number | null;
    sectionTitle: string | null;
  } | null;
}

/**
 * Records an answer. In practice mode the reveal data comes back immediately
 * (docs/exam-behavior.md); in exam mode only acknowledgement is returned —
 * answers and explanations stay hidden until submission.
 */
export async function answerQuestion(params: {
  attemptQuestionId: string;
  selectedOptionIndex: number;
  mode: "exam" | "practice";
}): Promise<AnswerResult | { acknowledged: true }> {
  const { supabase } = await requireStudent();
  await answerAttemptQuestion(supabase, {
    attemptQuestionId: params.attemptQuestionId,
    selectedOptionIndex: params.selectedOptionIndex,
  });

  if (params.mode === "exam") return { acknowledged: true };

  const { data, error } = await supabase
    .from("exam_attempt_questions")
    .select("question_snapshot")
    .eq("id", params.attemptQuestionId)
    .single();
  if (error || !data) throw new Error("Não foi possível carregar a explicação.");

  const snapshot = data.question_snapshot as {
    correctOptionIndex: number;
    explanation: string;
    options: { index: number; justification?: string | null }[];
    manualReference: AnswerResult["manualReference"];
  };

  return {
    isCorrect: snapshot.correctOptionIndex === params.selectedOptionIndex,
    correctOptionIndex: snapshot.correctOptionIndex,
    explanation: snapshot.explanation,
    optionJustifications: snapshot.options
      .sort((a, b) => a.index - b.index)
      .map((o) => o.justification ?? null),
    manualReference: snapshot.manualReference,
  };
}

export async function submitExam(attemptId: string): Promise<void> {
  const { supabase } = await requireStudent();
  await submitExamAttempt(supabase, attemptId);
  redirect(`/exame/${attemptId}/resultado`);
}
