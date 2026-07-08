"use server";

import { requireStudent } from "@/lib/auth";
import type { QuestionSnapshot } from "@/lib/domain/types";
import { notifyAdminOfSupportReport } from "@/lib/notify-admin";

/** Thumbs up/down on a question — one row per (student, question), toggled. */
export async function setQuestionFeedback(params: {
  questionId: string;
  attemptId: string | null;
  value: "thumbs_up" | "thumbs_down";
}): Promise<void> {
  const { supabase, studentId } = await requireStudent();
  const { error } = await supabase.from("question_feedback").upsert(
    {
      student_id: studentId,
      question_id: params.questionId,
      exam_attempt_id: params.attemptId,
      value: params.value,
    },
    { onConflict: "student_id,question_id" },
  );
  if (error) throw new Error(`Não foi possível registar o feedback: ${error.message}`);
}

/**
 * Question-specific report. The full question context is captured server-side
 * from the attempt snapshot (docs/question-reporting.md), so the report stays
 * useful even if the question is later edited or removed — and the correct
 * answer never travels through the browser during an open exam.
 */
export async function reportQuestion(params: {
  attemptQuestionId: string;
  kind: "bug" | "suggestion";
  message: string;
}): Promise<void> {
  const { supabase, studentId, email } = await requireStudent();

  const { data: row, error } = await supabase
    .from("exam_attempt_questions")
    .select(
      "question_id, exam_attempt_id, question_snapshot, exam_attempt_answers ( selected_option_index )",
    )
    .eq("id", params.attemptQuestionId)
    .single();
  if (error || !row) throw new Error("Pergunta não encontrada.");

  const snapshot = row.question_snapshot as QuestionSnapshot;
  const answer = Array.isArray(row.exam_attempt_answers)
    ? row.exam_attempt_answers[0]
    : row.exam_attempt_answers;

  const { error: insertError } = await supabase.from("support_reports").insert({
    student_id: studentId,
    question_id: row.question_id,
    exam_attempt_id: row.exam_attempt_id,
    kind: params.kind,
    message: params.message,
    question_context: {
      questionId: snapshot.questionId,
      prompt: snapshot.prompt,
      options: snapshot.options,
      correctOptionIndex: snapshot.correctOptionIndex,
      explanation: snapshot.explanation,
      presentationAnchor: snapshot.presentationAnchor,
      manualReference: snapshot.manualReference,
      themeCode: snapshot.themeCode,
      sourceScope: snapshot.sourceScope,
      status: snapshot.status,
      selectedOptionIndex: answer?.selected_option_index ?? null,
    },
  });
  if (insertError) {
    throw new Error(`Não foi possível enviar o reporte: ${insertError.message}`);
  }

  await notifyAdminOfSupportReport({
    kind: params.kind,
    message: params.message,
    studentEmail: email,
    questionContext: {
      prompt: snapshot.prompt,
      themeCode: snapshot.themeCode,
      selectedOptionIndex: answer?.selected_option_index ?? null,
    },
  });
}

/** General support message from anywhere in the app (no question context). */
export async function sendSupportMessage(params: {
  kind: "bug" | "suggestion";
  message: string;
}): Promise<void> {
  const { supabase, studentId, email } = await requireStudent();
  const { error } = await supabase.from("support_reports").insert({
    student_id: studentId,
    kind: params.kind,
    message: params.message,
  });
  if (error) throw new Error(`Não foi possível enviar a mensagem: ${error.message}`);

  await notifyAdminOfSupportReport({
    kind: params.kind,
    message: params.message,
    studentEmail: email,
  });
}
