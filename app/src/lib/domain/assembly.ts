import type { BlueprintEntry } from "./blueprint";
import { shuffle, type Rng } from "./rng";

/** A bank question as seen by the selector: identity plus exposure history. */
export interface SelectableQuestion {
  questionId: string;
  themeId: string;
  /** How many times this student has already been served this question. */
  seenCount: number;
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

/**
 * Picks questions for an attempt following the blueprint with repeat
 * suppression (ADR 0005): least-seen questions first, random order within the
 * same exposure level. Questions the student has seen before are the fallback
 * when a theme lacks enough unseen ones; if the whole theme bank is smaller
 * than its target the attempt simply carries fewer questions for that theme
 * (recorded as shortfall — a question is never duplicated inside one attempt).
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
    // Shuffle first so ordering inside each seenCount level is random, then
    // stable-sort by exposure so least-seen questions win.
    const pool = shuffle([...available], rng).sort(
      (a, b) => a.seenCount - b.seenCount,
    );
    const selected = pool.slice(0, entry.target).map((q) => q.questionId);
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
