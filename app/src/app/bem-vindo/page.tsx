import type { Metadata } from "next";
import Link from "next/link";

import { requireStudentForOnboarding } from "@/lib/auth";
import { ProfileForm } from "@/components/shared/profile-form";

export const metadata: Metadata = {
  title: "Bem-vindo — Padel Grau I",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const { email } = await requireStudentForOnboarding();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-6 pt-8">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-[0.2em] uppercase"
        >
          Padel <span className="text-court">·</span> Grau I
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-heading text-5xl font-bold uppercase">
          Bem-vindo<span className="text-ball">.</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Antes de começares, diz-nos como te chamas. Podes também adicionar uma
          foto de perfil.
        </p>
        <div className="mt-8">
          <ProfileForm email={email} />
        </div>
      </main>
    </div>
  );
}
