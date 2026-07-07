import { notFound, redirect } from "next/navigation";

import { ExamRunner } from "@/components/exam/exam-runner";
import type { RunnerQuestion } from "@/components/exam/types";
import { requireStudent } from "@/lib/auth";
import { submitExamAttempt } from "@/lib/services/exam-service";
import type { QuestionSnapshot } from "@/lib/domain/types";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase } = await requireStudent();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, mode, submitted_at, expires_at")
    .eq("id", attemptId)
    .eq("mode", "exam")
    .single();
  if (!attempt) notFound();
  if (attempt.submitted_at) redirect(`/exame/${attemptId}/resultado`);

  // Timer ran out while the student was away: close and show the result.
  if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
    await submitExamAttempt(supabase, attemptId);
    redirect(`/exame/${attemptId}/resultado`);
  }

  const { data: rows } = await supabase
    .from("exam_attempt_questions")
    .select("id, position, question_snapshot, exam_attempt_answers ( selected_option_index )")
    .eq("exam_attempt_id", attemptId)
    .order("position");
  if (!rows?.length) notFound();

  // Strip the snapshot to a client-safe shape: correct answers and
  // explanations never reach the browser during a timed exam.
  const questions: RunnerQuestion[] = rows.map((row) => {
    const snapshot = row.question_snapshot as QuestionSnapshot;
    const answer = Array.isArray(row.exam_attempt_answers)
      ? row.exam_attempt_answers[0]
      : row.exam_attempt_answers;
    return {
      attemptQuestionId: row.id,
      questionId: snapshot.questionId,
      position: row.position,
      prompt: snapshot.prompt,
      options: snapshot.options.map(({ index, text }) => ({ index, text })),
      themeCode: snapshot.themeCode,
      status: snapshot.status,
      selectedOptionIndex: answer?.selected_option_index ?? null,
    };
  });

  return (
    <ExamRunner
      attemptId={attemptId}
      expiresAt={attempt.expires_at}
      questions={questions}
    />
  );
}
