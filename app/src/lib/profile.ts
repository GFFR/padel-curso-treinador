const AVATAR_BUCKET = "avatars";

export function isOnboardingComplete(profile: {
  displayName: string | null;
}): boolean {
  return Boolean(profile.displayName?.trim());
}

export function getAvatarPublicUrl(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarPath}`;
}

/** Admin-facing label: "Gonçalo Ramalho <email@example.com>". */
export function formatStudentIdentity(
  profile: { displayName: string | null; email: string | null },
  fallback = "desconhecido",
): string {
  const name = profile.displayName?.trim();
  const email = profile.email?.trim();
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  if (email) return email;
  return fallback;
}

export function getProfileInitials(displayName: string | null, email: string | null): string {
  const source = displayName?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
