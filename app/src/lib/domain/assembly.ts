import type { BlueprintEntry } from "./blueprint";
import { shuffle, type Rng } from "./rng";

/** A bank question as seen by the selector: identity plus exposure history. */
export interface SelectableQuestion {
  questionId: string;
  themeId: string;
  /** How many times this student has already been served this question. */
  seenCount: number;
  /** `${materialId}:${page}` when anchored; null otherwise. */
  anchorKey: string | null;
}

export interface ThemeSelection {
  themeId: string;
  code: string;
  target: number;
  selected: string[];
  /** target - selected.length when the bank is too small (ADR 0005 fallback). */
  shortfall: number;
}

export interface ExamSelection {
  /** Question IDs in final exam order (themes interleaved by shuffle). */
  orderedQuestionIds: string[];
  perTheme: ThemeSelection[];
}

function compareBySeenCount(a: SelectableQuestion, b: SelectableQuestion): number {
  return a.seenCount - b.seenCount;
}

/**
 * Picks up to `target` questions from a theme pool with anchor spread first,
 * then least-seen fallback (ADR 0005). Never duplicates a question within one
 * attempt.
 */
export function selectFromThemePool(
  pool: SelectableQuestion[],
  target: number,
  rng: Rng,
): string[] {
  if (target <= 0 || pool.length === 0) return [];

  const shuffled = shuffle([...pool], rng);
  const sorted = [...shuffled].sort(compareBySeenCount);
  const selectedIds = new Set<string>();
  const usedAnchors = new Set<string>();
  const selected: string[] = [];

  // Phase 1: at most one question per distinct anchor (least-seen first).
  for (const question of sorted) {
    if (selected.length >= target) break;
    if (!question.anchorKey || usedAnchors.has(question.anchorKey)) continue;
    selected.push(question.questionId);
    selectedIds.add(question.questionId);
    usedAnchors.add(question.anchorKey);
  }

  // Phase 2: fill remainder by least-seen.
  for (const question of sorted) {
    if (selected.length >= target) break;
    if (selectedIds.has(question.questionId)) continue;
    selected.push(question.questionId);
    selectedIds.add(question.questionId);
  }

  return selected;
}

/**
 * Picks questions for an attempt following the blueprint with anchor spread
 * and repeat suppression (ADR 0005).
 */
export function selectExamQuestions(
  blueprint: BlueprintEntry[],
  bank: SelectableQuestion[],
  rng: Rng,
): ExamSelection {
  const byTheme = new Map<string, SelectableQuestion[]>();
  for (const question of bank) {
    const list = byTheme.get(question.themeId) ?? [];
    list.push(question);
    byTheme.set(question.themeId, list);
  }

  const perTheme: ThemeSelection[] = blueprint.map((entry) => {
    const available = byTheme.get(entry.themeId) ?? [];
    const selected = selectFromThemePool(available, entry.target, rng);
    return {
      themeId: entry.themeId,
      code: entry.code,
      target: entry.target,
      selected,
      shortfall: entry.target - selected.length,
    };
  });

  const orderedQuestionIds = shuffle(
    perTheme.flatMap((t) => t.selected),
    rng,
  );

  return { orderedQuestionIds, perTheme };
}
