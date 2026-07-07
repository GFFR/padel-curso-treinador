import { MIN_QUESTIONS_PER_THEME, EXAM_TOTAL_QUESTIONS } from "./types";

export interface ThemeWeight {
  themeId: string;
  code: string;
  calendarHours: number;
  /** Calendar position; breaks remainder ties (first occurrence wins). */
  sortOrder: number;
}

export interface BlueprintEntry {
  themeId: string;
  code: string;
  target: number;
}

/**
 * Distributes exam questions across themes proportionally to calendar hours
 * using deterministic largest-remainder rounding, guaranteeing every taught
 * theme at least MIN_QUESTIONS_PER_THEME. Remainder ties resolve by calendar
 * order (docs/course-material-map.md).
 */
export function computeBlueprint(
  themes: ThemeWeight[],
  totalQuestions: number = EXAM_TOTAL_QUESTIONS,
  minPerTheme: number = MIN_QUESTIONS_PER_THEME,
): BlueprintEntry[] {
  if (themes.length === 0) return [];
  if (totalQuestions < themes.length * minPerTheme) {
    throw new Error(
      `Cannot guarantee ${minPerTheme} questions per theme: ${themes.length} themes need ` +
        `${themes.length * minPerTheme} but the exam has ${totalQuestions} questions.`,
    );
  }

  const ordered = [...themes].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalHours = ordered.reduce((sum, t) => sum + t.calendarHours, 0);

  const shares = ordered.map((theme) => {
    const exact = (totalQuestions * theme.calendarHours) / totalHours;
    const floor = Math.max(Math.floor(exact), minPerTheme);
    return { theme, exact, floor, remainder: exact - Math.floor(exact) };
  });

  let assigned = shares.reduce((sum, s) => sum + s.floor, 0);
  const targets = new Map(shares.map((s) => [s.theme.themeId, s.floor]));

  if (assigned < totalQuestions) {
    // Largest remainder first; ties by calendar order (shares is already ordered).
    const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
    for (const share of byRemainder) {
      if (assigned === totalQuestions) break;
      targets.set(share.theme.themeId, targets.get(share.theme.themeId)! + 1);
      assigned += 1;
    }
  } else if (assigned > totalQuestions) {
    // The min-per-theme clamp overshot: trim from the largest targets, never below min.
    const byTargetDesc = () =>
      [...shares].sort(
        (a, b) => targets.get(b.theme.themeId)! - targets.get(a.theme.themeId)!,
      );
    while (assigned > totalQuestions) {
      const candidate = byTargetDesc().find(
        (s) => targets.get(s.theme.themeId)! > minPerTheme,
      );
      if (!candidate) break;
      targets.set(
        candidate.theme.themeId,
        targets.get(candidate.theme.themeId)! - 1,
      );
      assigned -= 1;
    }
  }

  return ordered.map((theme) => ({
    themeId: theme.themeId,
    code: theme.code,
    target: targets.get(theme.themeId)!,
  }));
}
