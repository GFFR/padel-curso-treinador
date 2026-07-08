import type { SupabaseClient } from "@supabase/supabase-js";

import type { BlueprintEntry } from "@/lib/domain/blueprint";
import {
  selectExamQuestions,
  type SelectableQuestion,
} from "@/lib/domain/assembly";
import { permuteOptions } from "@/lib/domain/options";
import { scoreExam } from "@/lib/domain/scoring";
import { shuffle, type Rng } from "@/lib/domain/rng";
import {
  EXAM_DURATION_MINUTES,
  STUDENT_VISIBLE_STATUSES,
  type QuestionSnapshot,
  type SourceScope,
  type ThemeCode,
} from "@/lib/domain/types";

/** Question row with options and source file names, as fetched for assembly. */
interface BankQuestionRow {
  id: string;
  theme_id: string;
  source_scope: SourceScope;
  prompt: string;
  correct_option_index: number;
  explanation: string;
  status: string;
  presentation_anchor_material_id: string | null;
  presentation_anchor_page: number | null;
  manual_reference_material_id: string | null;
  manual_reference_page: number | null;
  manual_reference_section: string | null;
  question_options: {
    option_index: number;
    text: string;
    justification: string | null;
  }[];
  presentation_anchor:
    | { file_name: string }[]
    | { file_name: string }
    | null;
  manual_reference: { file_name: string }[] | { file_name: string } | null;
}

const QUESTION_SELECT = `
  id, theme_id, source_scope, prompt, correct_option_index, explanation, status,
  presentation_anchor_material_id, presentation_anchor_page,
  manual_reference_material_id, manual_reference_page, manual_reference_section,
  question_options ( option_index, text, justification ),
  presentation_anchor:source_materials!questions_presentation_anchor_material_id_fkey ( file_name ),
  manual_reference:source_materials!questions_manual_reference_material_id_fkey ( file_name )
`;

function firstOrNull<T>(value: T[] | T | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toSnapshot(
  row: BankQuestionRow,
  themeCode: ThemeCode,
  rng: Rng,
): QuestionSnapshot {
  const anchorFile = firstOrNull(row.presentation_anchor);
  const manualFile = firstOrNull(row.manual_reference);
  // Options are shuffled per attempt: the bank's canonical order carries a
  // strong position bias from generation (correct answer mostly first).
  const permuted = permuteOptions(
    [...row.question_options]
      .sort((a, b) => a.option_index - b.option_index)
      .map((o) => ({
        index: o.option_index,
        text: o.text,
        justification: o.justification,
      })),
    row.correct_option_index,
    rng,
  );
  return {
    questionId: row.id,
    themeCode,
    status: row.status as QuestionSnapshot["status"],
    prompt: row.prompt,
    options: permuted.options,
    correctOptionIndex: permuted.correctOptionIndex,
    explanation: row.explanation,
    sourceScope: row.source_scope,
    presentationAnchor: row.presentation_anchor_material_id
      ? {
          materialId: row.presentation_anchor_material_id,
          fileName: anchorFile?.file_name ?? null,
          page: row.presentation_anchor_page,
        }
      : null,
    manualReference: row.manual_reference_material_id
      ? {
          materialId: row.manual_reference_material_id,
          fileName: manualFile?.file_name ?? null,
          page: row.manual_reference_page,
          sectionTitle: row.manual_reference_section,
        }
      : null,
  };
}

/**
 * Loads the student-visible question bank for a scope. "presentations_only"
 * serves only questions generated from presentations; "full_materials" serves
 * the whole bank (see decision 0005).
 */
async function fetchBank(
  supabase: SupabaseClient,
  sourceScope: SourceScope,
): Promise<BankQuestionRow[]> {
  let query = supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .in("status", STUDENT_VISIBLE_STATUSES);
  if (sourceScope === "presentations_only") {
    query = query.eq("source_scope", "presentations_only");
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load question bank: ${error.message}`);
  return (data ?? []) as unknown as BankQuestionRow[];
}

/** Times each bank question was already served to this student (any mode). */
async function fetchSeenCounts(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("exam_attempt_questions")
    .select("question_id, exam_attempts!inner ( student_id )")
    .eq("exam_attempts.student_id", studentId);
  if (error) throw new Error(`Failed to load exposure history: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.question_id, (counts.get(row.question_id) ?? 0) + 1);
  }
  return counts;
}

async function insertAttemptQuestions(
  supabase: SupabaseClient,
  attemptId: string,
  orderedIds: string[],
  rowsById: Map<string, BankQuestionRow>,
  codeByThemeId: Map<string, ThemeCode>,
  rng: Rng,
) {
  const rows = orderedIds.map((questionId, position) => {
    const row = rowsById.get(questionId)!;
    return {
      exam_attempt_id: attemptId,
      question_id: questionId,
      position,
      theme_id: row.theme_id,
      question_snapshot: toSnapshot(row, codeByThemeId.get(row.theme_id)!, rng),
    };
  });
  const { error } = await supabase.from("exam_attempt_questions").insert(rows);
  if (error) throw new Error(`Failed to snapshot questions: ${error.message}`);
}

export interface AssembledAttempt {
  attemptId: string;
  questionCount: number;
  shortfalls: { code: string; target: number; selected: number }[];
}

/**
 * Assembles and persists a fresh full exam attempt: blueprint targets from
 * course_themes, repeat-suppressed random selection, stable snapshot rows,
 * 90-minute expiry (ADR 0005, docs/exam-behavior.md).
 */
export async function createExamAttempt(
  supabase: SupabaseClient,
  params: { studentId: string; sourceScope: SourceScope; rng?: Rng },
): Promise<AssembledAttempt> {
  const rng = params.rng ?? Math.random;

  const { data: themes, error: themesError } = await supabase
    .from("course_themes")
    .select("id, code, exam_question_target, sort_order")
    .order("sort_order");
  if (themesError || !themes?.length) {
    throw new Error(`Failed to load course themes: ${themesError?.message}`);
  }

  const blueprint: BlueprintEntry[] = themes.map((t) => ({
    themeId: t.id,
    code: t.code,
    target: t.exam_question_target,
  }));
  const codeByThemeId = new Map<string, ThemeCode>(
    themes.map((t) => [t.id, t.code as ThemeCode]),
  );

  const bank = await fetchBank(supabase, params.sourceScope);
  const seen = await fetchSeenCounts(supabase, params.studentId);
  const selectable: SelectableQuestion[] = bank.map((row) => ({
    questionId: row.id,
    themeId: row.theme_id,
    seenCount: seen.get(row.id) ?? 0,
  }));

  const selection = selectExamQuestions(blueprint, selectable, rng);
  if (selection.orderedQuestionIds.length === 0) {
    throw new Error("The question bank is empty for this scope.");
  }

  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + EXAM_DURATION_MINUTES * 60 * 1000,
  );

  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .insert({
      student_id: params.studentId,
      mode: "exam",
      source_scope: params.sourceScope,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      blueprint_snapshot: {
        totalQuestions: selection.orderedQuestionIds.length,
        sourceScope: params.sourceScope,
        perTheme: selection.perTheme.map((t) => ({
          code: t.code,
          target: t.target,
          selected: t.selected.length,
          shortfall: t.shortfall,
        })),
      },
    })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    throw new Error(`Failed to create attempt: ${attemptError?.message}`);
  }

  const rowsById = new Map(bank.map((row) => [row.id, row]));
  await insertAttemptQuestions(
    supabase,
    attempt.id,
    selection.orderedQuestionIds,
    rowsById,
    codeByThemeId,
    rng,
  );

  return {
    attemptId: attempt.id,
    questionCount: selection.orderedQuestionIds.length,
    shortfalls: selection.perTheme
      .filter((t) => t.shortfall > 0)
      .map((t) => ({ code: t.code, target: t.target, selected: t.selected.length })),
  };
}

/**
 * Assembles an untimed practice session for one theme. Same snapshot shape as
 * exams so answering/feedback/reporting flow identically (decision 0003).
 */
export async function createPracticeSession(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    themeId: string;
    sourceScope: SourceScope;
    questionCount?: number;
    rng?: Rng;
  },
): Promise<AssembledAttempt> {
  const rng = params.rng ?? Math.random;
  const count = params.questionCount ?? 10;

  const { data: theme, error: themeError } = await supabase
    .from("course_themes")
    .select("id, code")
    .eq("id", params.themeId)
    .single();
  if (themeError || !theme) {
    throw new Error(`Unknown course theme: ${themeError?.message}`);
  }

  const bank = (await fetchBank(supabase, params.sourceScope)).filter(
    (row) => row.theme_id === params.themeId,
  );
  const seen = await fetchSeenCounts(supabase, params.studentId);
  const selectable: SelectableQuestion[] = bank.map((row) => ({
    questionId: row.id,
    themeId: row.theme_id,
    seenCount: seen.get(row.id) ?? 0,
  }));

  const selection = selectExamQuestions(
    [{ themeId: theme.id, code: theme.code, target: count }],
    selectable,
    rng,
  );
  if (selection.orderedQuestionIds.length === 0) {
    throw new Error("No questions available for this theme yet.");
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .insert({
      student_id: params.studentId,
      mode: "practice",
      source_scope: params.sourceScope,
      practice_theme_id: params.themeId,
      blueprint_snapshot: {
        totalQuestions: selection.orderedQuestionIds.length,
        sourceScope: params.sourceScope,
        perTheme: selection.perTheme.map((t) => ({
          code: t.code,
          target: t.target,
          selected: t.selected.length,
          shortfall: t.shortfall,
        })),
      },
    })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    throw new Error(`Failed to create practice session: ${attemptError?.message}`);
  }

  const rowsById = new Map(bank.map((row) => [row.id, row]));
  const codeByThemeId = new Map<string, ThemeCode>([
    [theme.id, theme.code as ThemeCode],
  ]);
  await insertAttemptQuestions(
    supabase,
    attempt.id,
    selection.orderedQuestionIds,
    rowsById,
    codeByThemeId,
    rng,
  );

  return {
    attemptId: attempt.id,
    questionCount: selection.orderedQuestionIds.length,
    shortfalls: [],
  };
}

/** Records (or changes) the student's answer to one attempt question. */
export async function answerAttemptQuestion(
  supabase: SupabaseClient,
  params: { attemptQuestionId: string; selectedOptionIndex: number },
): Promise<{ isCorrect: boolean }> {
  const { data: aq, error } = await supabase
    .from("exam_attempt_questions")
    .select("id, question_snapshot")
    .eq("id", params.attemptQuestionId)
    .single();
  if (error || !aq) throw new Error(`Attempt question not found: ${error?.message}`);

  const snapshot = aq.question_snapshot as QuestionSnapshot;
  const isCorrect = snapshot.correctOptionIndex === params.selectedOptionIndex;

  const { error: upsertError } = await supabase
    .from("exam_attempt_answers")
    .upsert(
      {
        exam_attempt_question_id: params.attemptQuestionId,
        selected_option_index: params.selectedOptionIndex,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "exam_attempt_question_id" },
    );
  if (upsertError) throw new Error(`Failed to save answer: ${upsertError.message}`);

  return { isCorrect };
}

/**
 * Closes a full exam attempt and stores the 0-20 score. Unanswered questions
 * count as wrong (docs/exam-behavior.md).
 */
export async function submitExamAttempt(
  supabase: SupabaseClient,
  attemptId: string,
): Promise<{ score0to20: number; passed: boolean; correctCount: number; totalQuestions: number }> {
  const { data: questions, error } = await supabase
    .from("exam_attempt_questions")
    .select("id, exam_attempt_answers ( is_correct )")
    .eq("exam_attempt_id", attemptId);
  if (error || !questions?.length) {
    throw new Error(`Failed to load attempt questions: ${error?.message}`);
  }

  const correctCount = questions.filter((q) => {
    const answer = firstOrNull(q.exam_attempt_answers);
    return answer?.is_correct === true;
  }).length;

  const result = scoreExam(correctCount, questions.length);

  const { error: updateError } = await supabase
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score_0_20: result.score0to20,
      passed: result.passed,
    })
    .eq("id", attemptId);
  if (updateError) throw new Error(`Failed to submit attempt: ${updateError.message}`);

  return {
    score0to20: result.score0to20,
    passed: result.passed,
    correctCount,
    totalQuestions: questions.length,
  };
}

/** Re-exported for tests. */
export { shuffle };
