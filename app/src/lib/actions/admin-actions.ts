"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuestionStatus } from "@/lib/domain/types";

/**
 * Admin review decision on a question. Question mutations go through the
 * service-role client — students have read-only access to the bank (RLS,
 * decision 0003) — after an explicit admin check.
 */
export async function setQuestionStatus(
  questionId: string,
  status: QuestionStatus,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("questions")
    .update({ status })
    .eq("id", questionId);
  if (error) throw new Error(`Falha ao atualizar a pergunta: ${error.message}`);
  revalidatePath("/admin/perguntas");
}

/** Sets the global default bank set (theme_id null row). */
export async function setGlobalBankSet(bankSetId: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("bank_set_activation")
    .upsert(
      { bank_set_id: bankSetId, theme_id: null },
      { onConflict: "theme_id" },
    );
  if (error) {
    throw new Error(`Falha ao definir banco global: ${error.message}`);
  }
  revalidatePath("/admin/banco");
  revalidatePath("/praticar");
}

/** Sets or clears a per-theme bank set override (null clears → use global). */
export async function setThemeBankSetOverride(
  themeId: string,
  bankSetId: string | null,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  if (bankSetId === null) {
    const { error } = await admin
      .from("bank_set_activation")
      .delete()
      .eq("theme_id", themeId);
    if (error) {
      throw new Error(`Falha ao remover override: ${error.message}`);
    }
  } else {
    const { error } = await admin
      .from("bank_set_activation")
      .upsert(
        { bank_set_id: bankSetId, theme_id: themeId },
        { onConflict: "theme_id" },
      );
    if (error) {
      throw new Error(`Falha ao definir override: ${error.message}`);
    }
  }
  revalidatePath("/admin/banco");
  revalidatePath("/praticar");
}
