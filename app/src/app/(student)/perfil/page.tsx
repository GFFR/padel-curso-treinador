import type { Metadata } from "next";

import { requireStudent } from "@/lib/auth";
import { getAvatarPublicUrl } from "@/lib/profile";
import { ProfileForm } from "@/components/shared/profile-form";

export const metadata: Metadata = {
  title: "Perfil — Padel Grau I",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { displayName, email, avatarPath } = await requireStudent();
  const avatarUrl = getAvatarPublicUrl(avatarPath);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-heading text-4xl font-bold uppercase">Perfil</h1>
      <p className="mt-3 text-muted-foreground">
        Altera o teu nome ou foto de perfil.
      </p>
      <div className="mt-8">
        <ProfileForm
          email={email}
          initialDisplayName={displayName ?? ""}
          initialAvatarUrl={avatarUrl}
          submitLabel="Guardar"
          avatarActionLabel="Alterar foto"
        />
      </div>
    </div>
  );
}
