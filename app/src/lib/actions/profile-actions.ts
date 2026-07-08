"use server";

import { z } from "zod";

import { requireStudentForOnboarding } from "@/lib/auth";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(80, "O nome é demasiado longo."),
});

function avatarExtension(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export async function completeOnboarding(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireStudentForOnboarding();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entra novamente." };

  let avatarPath: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_AVATAR_TYPES.has(avatar.type)) {
      return { error: "A foto deve ser JPG, PNG ou WebP." };
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { error: "A foto não pode exceder 2 MB." };
    }

    avatarPath = `${user.id}/avatar.${avatarExtension(avatar.type)}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) {
      return { error: "Não foi possível carregar a foto. Tenta novamente." };
    }
  }

  const { error } = await supabase
    .from("student_profiles")
    .update({
      display_name: parsed.data.displayName,
      avatar_path: avatarPath,
    })
    .eq("auth_user_id", user.id);
  if (error) {
    return { error: "Não foi possível guardar o perfil. Tenta novamente." };
  }

  return {};
}
