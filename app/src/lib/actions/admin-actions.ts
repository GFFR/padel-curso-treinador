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
