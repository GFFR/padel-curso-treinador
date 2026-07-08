"use server";

import { z } from "zod";

import { requireAuthenticatedStudent } from "@/lib/auth";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const profileSchema = z.object({
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

export async function updateProfile(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireAuthenticatedStudent();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entra novamente." };

  const updatePayload: { display_name: string; avatar_path?: string } = {
    display_name: parsed.data.displayName,
  };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_AVATAR_TYPES.has(avatar.type)) {
      return { error: "A foto deve ser JPG, PNG ou WebP." };
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { error: "A foto não pode exceder 2 MB." };
    }

    const avatarPath = `${user.id}/avatar.${avatarExtension(avatar.type)}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) {
      return { error: "Não foi possível carregar a foto. Tenta novamente." };
    }
    updatePayload.avatar_path = avatarPath;
  }

  const { error } = await supabase
    .from("student_profiles")
    .update(updatePayload)
    .eq("auth_user_id", user.id);
  if (error) {
    return { error: "Não foi possível guardar o perfil. Tenta novamente." };
  }

  return {};
}

/** @deprecated Use updateProfile */
export const completeOnboarding = updateProfile;
