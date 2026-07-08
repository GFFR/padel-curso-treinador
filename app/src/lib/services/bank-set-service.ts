import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildActiveBankSetByTheme,
  type BankSetActivation,
} from "@/lib/domain/bank-sets";
import { STUDENT_VISIBLE_STATUSES } from "@/lib/domain/types";

export interface BankSetRow {
  id: string;
  code: string;
  label: string;
  description: string | null;
}

/** Loads all bank sets ordered by code. */
export async function fetchBankSets(
  supabase: SupabaseClient,
): Promise<BankSetRow[]> {
  const { data, error } = await supabase
    .from("question_bank_sets")
    .select("id, code, label, description")
    .order("code");
  if (error) throw new Error(`Failed to load bank sets: ${error.message}`);
  return data ?? [];
}

/** Loads global default + per-theme activation rows. */
export async function fetchBankSetActivations(
  supabase: SupabaseClient,
): Promise<BankSetActivation[]> {
  const { data, error } = await supabase
    .from("bank_set_activation")
    .select("bank_set_id, theme_id");
  if (error) {
    throw new Error(`Failed to load bank set activations: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    bankSetId: row.bank_set_id,
    themeId: row.theme_id,
  }));
}

/**
 * Counts student-visible questions per theme, filtered to each theme's active
 * bank set.
 */
export async function fetchActiveQuestionCountsByTheme(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const [{ data: themes }, { data: questions }, activations] = await Promise.all([
    supabase.from("course_themes").select("id"),
    supabase
      .from("questions")
      .select("theme_id, bank_set_id")
      .in("status", STUDENT_VISIBLE_STATUSES),
    fetchBankSetActivations(supabase),
  ]);

  const themeIds = (themes ?? []).map((t) => t.id);
  const activeByTheme = buildActiveBankSetByTheme(themeIds, activations);

  const counts = new Map<string, number>();
  for (const row of questions ?? []) {
    if (row.bank_set_id !== activeByTheme.get(row.theme_id)) continue;
    counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1);
  }
  return counts;
}

export interface ThemeBankOverrideRow {
  themeId: string;
  code: string;
  name: string;
  activeBankSetId: string;
  activeBankSetCode: string;
  overrideBankSetId: string | null;
  questionCount: number;
}

/** Admin view: each theme's effective bank set and visible question count. */
export async function fetchThemeBankOverview(
  supabase: SupabaseClient,
): Promise<ThemeBankOverrideRow[]> {
  const [{ data: themes }, bankSets, activations] = await Promise.all([
    supabase.from("course_themes").select("id, code, name").order("sort_order"),
    fetchBankSets(supabase),
    fetchBankSetActivations(supabase),
  ]);

  const codeById = new Map(bankSets.map((b) => [b.id, b.code]));
  const global = activations.find((a) => a.themeId === null);
  if (!global) throw new Error("No global bank set configured.");

  const overrideByTheme = new Map(
    activations
      .filter((a) => a.themeId !== null)
      .map((a) => [a.themeId!, a.bankSetId]),
  );

  const { data: questions, error } = await supabase
    .from("questions")
    .select("theme_id, bank_set_id")
    .in("status", STUDENT_VISIBLE_STATUSES);
  if (error) throw new Error(error.message);

  const countKey = (themeId: string, bankSetId: string) => `${themeId}:${bankSetId}`;
  const counts = new Map<string, number>();
  for (const row of questions ?? []) {
    const key = countKey(row.theme_id, row.bank_set_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (themes ?? []).map((theme) => {
    const activeBankSetId = overrideByTheme.get(theme.id) ?? global.bankSetId;
    return {
      themeId: theme.id,
      code: theme.code,
      name: theme.name,
      activeBankSetId,
      activeBankSetCode: codeById.get(activeBankSetId) ?? "?",
      overrideBankSetId: overrideByTheme.get(theme.id) ?? null,
      questionCount: counts.get(countKey(theme.id, activeBankSetId)) ?? 0,
    };
  });
}
