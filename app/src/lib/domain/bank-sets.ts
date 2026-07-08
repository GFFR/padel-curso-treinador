/** A versioned question bank set (v1, v2, …). */
export interface BankSet {
  id: string;
  code: string;
  label: string;
}

/** Global default (themeId null) or per-theme override row. */
export interface BankSetActivation {
  bankSetId: string;
  themeId: string | null;
}

/**
 * Resolves the active bank set for a theme: per-theme override wins, else
 * global default. Throws if no global default is configured.
 */
export function resolveActiveBankSetId(
  themeId: string,
  activations: BankSetActivation[],
): string {
  const override = activations.find((a) => a.themeId === themeId);
  if (override) return override.bankSetId;

  const global = activations.find((a) => a.themeId === null);
  if (!global) {
    throw new Error("No global bank set activation configured.");
  }
  return global.bankSetId;
}

/** Builds a map themeId ? active bankSetId for all themes. */
export function buildActiveBankSetByTheme(
  themeIds: string[],
  activations: BankSetActivation[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const themeId of themeIds) {
    map.set(themeId, resolveActiveBankSetId(themeId, activations));
  }
  return map;
}

/** Returns true when a question row belongs to the active set for its theme. */
export function isQuestionInActiveBankSet(
  question: { themeId: string; bankSetId: string },
  activations: BankSetActivation[],
): boolean {
  return (
    question.bankSetId === resolveActiveBankSetId(question.themeId, activations)
  );
}
