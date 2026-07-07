import { notFound } from "next/navigation";

import { PracticeRunner } from "@/components/exam/practice-runner";
import type { RunnerQuestion } from "@/components/exam/types";
import { requireStudent } from "@/lib/auth";
import type { QuestionSnapshot } from "@/lib/domain/types";

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { supabase } = await requireStudent();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, mode, course_themes:practice_theme_id ( name )")
    .eq("id", attemptId)
    .eq("mode", "practice")
    .single();
  if (!attempt) notFound();

  const { data: rows } = await supabase
    .from("exam_attempt_questions")
    .select("id, position, question_snapshot")
    .eq("exam_attempt_id", attemptId)
    .order("position");
  if (!rows?.length) notFound();

  const questions: RunnerQuestion[] = rows.map((row) => {
    const snapshot = row.question_snapshot as QuestionSnapshot;
    return {
      attemptQuestionId: row.id,
      questionId: snapshot.questionId,
      position: row.position,
      prompt: snapshot.prompt,
      options: snapshot.options.map(({ index, text }) => ({ index, text })),
      themeCode: snapshot.themeCode,
      status: snapshot.status,
      selectedOptionIndex: null,
    };
  });

  const theme = Array.isArray(attempt.course_themes)
    ? attempt.course_themes[0]
    : attempt.course_themes;

  return (
    <PracticeRunner
      attemptId={attemptId}
      themeName={theme?.name ?? "Tema"}
      questions={questions}
    />
  );
}
